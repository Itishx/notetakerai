type UserKnowledgeOptions = {
  includeMemoryNotes?: boolean;
  includeXPersona?: boolean;
  includeXContentSource?: boolean;
  includeContacts?: boolean;
  memoryNoteLimit?: number;
  contactLimit?: number;
};

type XPersonaContext = {
  display_name: string | null;
  bio: string | null;
  what_building: string | null;
  tone_notes: string | null;
  content_source?: string | null;
} | null;

export type UserKnowledge = {
  displayName: string;
  overallMemory: string;
  memoryNotes: string[];
  contacts: string[];
  xPersona: XPersonaContext;
  combinedContext: string;
};

export async function loadUserKnowledge(
  supabase: any,
  userId: string,
  options: UserKnowledgeOptions = {},
): Promise<UserKnowledge> {
  const includeMemoryNotes = options.includeMemoryNotes ?? true;
  const includeXPersona = options.includeXPersona ?? true;
  const includeXContentSource = options.includeXContentSource ?? false;
  const includeContacts = options.includeContacts ?? true;
  const memoryNoteLimit = options.memoryNoteLimit ?? 12;
  const contactLimit = options.contactLimit ?? 8;

  const [profileContext, memoryResult, xPersonaResult, contactsResult] = await Promise.all([
    loadProfileContext(supabase, userId),
    includeMemoryNotes
      ? supabase
          .from("notes")
          .select("title,structured_notes")
          .eq("user_id", userId)
          .eq("use_case", "memory")
          .order("created_at", { ascending: false })
          .limit(memoryNoteLimit)
      : Promise.resolve({ data: [], error: null }),
    includeXPersona
      ? supabase
          .from("x_auto_persona")
          .select("display_name,bio,what_building,tone_notes,content_source")
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    includeContacts
      ? supabase
          .from("braino_contacts")
          .select("name,nickname,email,phone")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(contactLimit)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const memoryNotes = Array.isArray(memoryResult?.data)
    ? uniqueStrings(
        memoryResult.data
          .map((note: any) => String(note?.structured_notes || note?.title || "").trim())
          .filter(Boolean),
      )
    : [];

  const xPersona = xPersonaResult?.data
    ? {
        display_name: cleanText(xPersonaResult.data.display_name),
        bio: cleanText(xPersonaResult.data.bio),
        what_building: cleanText(xPersonaResult.data.what_building),
        tone_notes: cleanText(xPersonaResult.data.tone_notes),
        content_source: cleanText(xPersonaResult.data.content_source),
      }
    : null;

  const contacts = Array.isArray(contactsResult?.data)
    ? uniqueStrings(
        contactsResult.data
          .map((contact: any) => {
            const name = cleanText(contact?.name);
            if (!name) return "";
            const nickname = cleanText(contact?.nickname);
            const email = cleanText(contact?.email);
            const phone = cleanText(contact?.phone);
            const bits = [
              nickname ? `nickname: ${nickname}` : "",
              email ? `email: ${email}` : "",
              phone ? `phone: ${phone}` : "",
            ].filter(Boolean);
            return bits.length ? `${name} — ${bits.join("; ")}` : name;
          })
          .filter(Boolean),
      )
    : [];

  const combinedContext = buildUserKnowledgeContext({
    displayName: profileContext.displayName,
    overallMemory: profileContext.overallMemory,
    memoryNotes,
    contacts,
    xPersona,
    includeXContentSource,
  });

  return {
    displayName: profileContext.displayName,
    overallMemory: profileContext.overallMemory,
    memoryNotes,
    contacts,
    xPersona,
    combinedContext,
  };
}

export function buildUserKnowledgeContext(input: {
  displayName?: string | null;
  overallMemory?: string | null;
  memoryNotes?: string[];
  contacts?: string[];
  xPersona?: XPersonaContext;
  includeXContentSource?: boolean;
}) {
  const sections: string[] = [];
  const displayName = cleanText(input.displayName);
  const overallMemory = cleanText(input.overallMemory);
  const memoryNotes = uniqueStrings((input.memoryNotes || []).map((note) => cleanText(note)).filter(Boolean) as string[]);
  const contacts = uniqueStrings((input.contacts || []).map((contact) => cleanText(contact)).filter(Boolean) as string[]);

  if (displayName) {
    sections.push(`Name: ${displayName}`);
  }

  if (overallMemory) {
    sections.push(`Overall user profile:\n${overallMemory}`);
  }

  if (memoryNotes.length > 0) {
    sections.push(`Additional remembered facts:\n${memoryNotes.map((note) => `- ${note}`).join("\n")}`);
  }

  if (contacts.length > 0) {
    sections.push(`Saved contacts:\n${contacts.map((contact) => `- ${contact}`).join("\n")}`);
  }

  const xLines = [
    input.xPersona?.display_name ? `Name: ${input.xPersona.display_name}` : null,
    input.xPersona?.bio ? `Who they are: ${input.xPersona.bio}` : null,
    input.xPersona?.what_building ? `What they are building: ${input.xPersona.what_building}` : null,
    input.xPersona?.tone_notes ? `Voice and tone: ${input.xPersona.tone_notes}` : null,
  ].filter(Boolean);

  if (input.includeXContentSource && input.xPersona?.content_source) {
    xLines.push(`Content source:\n${input.xPersona.content_source}`);
  }

  if (xLines.length > 0) {
    sections.push(`X automation profile:\n${xLines.join("\n")}`);
  }

  return sections.join("\n\n").trim();
}

async function loadProfileContext(supabase: any, userId: string) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name,overall_memory")
      .eq("user_id", userId)
      .maybeSingle();

    if (!error) {
      return {
        displayName: cleanText(data?.display_name),
        overallMemory: cleanText(data?.overall_memory),
      };
    }
  } catch {
    // Fall back to the legacy shape below if the new column is not deployed yet.
  }

  try {
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", userId)
      .maybeSingle();

    return {
      displayName: cleanText(data?.display_name),
      overallMemory: "",
    };
  } catch {
    return {
      displayName: "",
      overallMemory: "",
    };
  }
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}
