import SwiftUI

/// The Mac onboarding's story, told for a phone. Same lines, same order,
/// shaped like Uber: the picture fills the top, a sheet rises over it.
struct Step: Identifiable {
    enum Kind { case story, name, persona, connect, done }
    let id: String
    let kind: Kind
    let kicker: String
    let title: String
    var sub: String? = nil
    var art = "affective-hero"
}

let scenes: [Step] = [
    .init(id: "os", kind: .story, kicker: "Welcome to AffectiveOS", title: "A computer that finally *understands* you.", sub: "It sees, listens, acts and remembers. So you don't have to explain yourself twice.", art: "affective-hero"),
    .init(id: "braino", kind: .story, kicker: "Meet Braino", title: "Hi. I'm Braino. I live in your *notch.*", sub: "Right at the top of your Mac. And now, in your pocket.", art: "os-senses"),
    .init(id: "meetings", kind: .story, kicker: "Meetings and lectures", title: "Every word, written down while you *listen.*", sub: "I write the notes and remember what you promised. Then I remind you before it's due.", art: "os-voice"),
    .init(id: "do", kind: .story, kicker: "Phone to Mac", title: "Say it here. Your Mac gets it *done.*", sub: "Ask from anywhere. Your Mac opens, compares and types for you, and tells you when it's finished.", art: "os-hands"),
    .init(id: "memory", kind: .story, kicker: "Memory", title: "Tell me once. I'll *remember.*", sub: "On every device. You can see, edit or delete anything I keep.", art: "os-memory"),
    .init(id: "name", kind: .name, kicker: "Make me yours", title: "First, what should I *call* you?", art: "affective-footer"),
    .init(id: "persona", kind: .persona, kicker: "Make me yours", title: "And what do you *do?*", art: "affective-footer"),
    .init(id: "connect", kind: .connect, kicker: "Your Mac", title: "Let's find your *Mac.*", sub: "Same account on both, and everything stays in sync.", art: "os-hands"),
    .init(id: "done", kind: .done, kicker: "That's us", title: "Nice to meet you", art: "affective-hero"),
]

struct Onboarding: View {
    @Binding var name: String
    var finish: () -> Void
    @State private var at = 0
    @State private var persona = ""
    @State private var mic = false
    @State private var nudges = false
    @State private var macLinked = false
    @FocusState private var typing: Bool

    var scene: Step { scenes[at] }
    var title: String { scene.kind == .done ? "Nice to meet you, *\(name).*" : scene.title }

    var body: some View {
        GeometryReader { g in
            let artH = g.size.height * (scene.kind == .story ? 0.44 : 0.30)
            ZStack(alignment: .top) {
                // The picture
                ZStack {
                    Art(name: scene.art).id(scene.art).transition(.opacity)
                    LinearGradient(colors: [.black.opacity(0.28), .clear], startPoint: .top, endPoint: .center)
                    overlay.id(scene.id).padding(.horizontal, 24).padding(.top, g.safeAreaInsets.top + 44)
                        .frame(maxHeight: .infinity, alignment: .center)
                }
                .frame(height: artH + 40 + g.safeAreaInsets.top)
                .ignoresSafeArea(edges: .top)

                // Top bar on the art
                HStack {
                    Image("logo").renderingMode(.template).resizable().scaledToFit().frame(height: 18).foregroundStyle(.white)
                    Spacer()
                    if at > 0 && scene.kind != .done {
                        Button { Haptic.tap(); move(-1) } label: {
                            Image(systemName: "chevron.left").font(.system(size: 14, weight: .semibold))
                                .frame(width: 36, height: 36).background(.ultraThinMaterial, in: Circle()).foregroundStyle(.white)
                        }
                    }
                }
                .padding(.horizontal, 24).padding(.top, 14)

                // The sheet
                VStack(alignment: .leading, spacing: 0) {
                    Capsule().fill(Color.line).frame(width: 36, height: 5).frame(maxWidth: .infinity).padding(.top, 10).padding(.bottom, 22)
                    Kicker(text: scene.kicker).padding(.bottom, 14)
                    LitHeadline(text: title, size: scene.kind == .story ? 38 : 34).id(title)
                    if let sub = scene.sub {
                        Text(sub).font(.system(size: 16.5)).foregroundStyle(Color.ink2).lineSpacing(3).tracking(-0.2)
                            .fixedSize(horizontal: false, vertical: true).padding(.top, 14).arrive(0.6).id(sub)
                    }
                    controls.padding(.top, 24)
                    Spacer(minLength: 12)
                    footer
                }
                .padding(.horizontal, 24)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                .background(Color.paper)
                .clipShape(UnevenRoundedRectangle(topLeadingRadius: 32, topTrailingRadius: 32, style: .continuous))
                .shadow(color: .black.opacity(0.12), radius: 20, y: -6)
                .padding(.top, artH).ignoresSafeArea(edges: .bottom)
                .animation(.spring(response: 0.55, dampingFraction: 0.9), value: artH)
            }
        }
        .animation(.easeInOut(duration: 0.45), value: at)
        .gesture(DragGesture(minimumDistance: 30).onEnded { v in
            guard scene.kind == .story else { return }
            if v.translation.width < -50 { move(1) } else if v.translation.width > 50 { move(-1) }
        })
    }

    func move(_ d: Int) {
        typing = false
        let n = at + d
        guard n >= 0, n < scenes.count else { return }
        at = n
    }

    var g0: CGFloat { 24 }
    var footer: some View {
        VStack(spacing: 18) {
            HStack(spacing: 6) {
                ForEach(0..<scenes.count, id: \.self) { i in
                    Capsule().fill(i == at ? Color.ink : i < at ? Color.ink3 : Color.line)
                        .frame(width: i == at ? 22 : 6, height: 6)
                }
                Spacer()
                Text("\(at + 1) of \(scenes.count)").font(.system(size: 12.5).monospacedDigit()).foregroundStyle(Color.ink3)
            }
            .animation(.spring(response: 0.4), value: at)
            PrimaryButton(title: buttonTitle, enabled: canGo) {
                if scene.kind == .done { Haptic.done(); finish() } else { move(1) }
            }
        }
        .padding(.bottom, g0 + 8)
    }

    var buttonTitle: String {
        switch scene.kind {
        case .connect: return macLinked ? "Continue" : "Continue for now"
        case .done: return "Start using Braino"
        default: return "Continue"
        }
    }
    var canGo: Bool { scene.kind == .name ? !name.trimmingCharacters(in: .whitespaces).isEmpty : true }

    // MARK: Per-step controls in the sheet
    @ViewBuilder var controls: some View {
        switch scene.kind {
        case .name:
            TextField("Your first name", text: $name)
                .font(.system(size: 22, weight: .medium)).tracking(-0.4)
                .padding(.horizontal, 18).frame(height: 60)
                .background(Color.box, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(typing ? Color.ink : Color.line, lineWidth: 1))
                .focused($typing).submitLabel(.continue).onSubmit { move(1) }
                .arrive(0.3)
        case .persona:
            Flow(spacing: 10) {
                ForEach(["Student", "Founder", "Engineer", "Designer", "Creator", "Something else"], id: \.self) { o in
                    Button { Haptic.tap(); persona = o } label: {
                        Text(o).font(.system(size: 16, weight: .medium)).padding(.horizontal, 20).frame(height: 46)
                            .background(persona == o ? Color.ink : Color.box, in: Capsule())
                            .overlay(Capsule().stroke(persona == o ? Color.ink : Color.line, lineWidth: 1))
                            .foregroundStyle(persona == o ? .white : Color.ink)
                    }
                    .buttonStyle(Press())
                }
            }
            .arrive(0.3)
        case .connect:
            VStack(spacing: 10) {
                PermRow(title: "Your Mac", why: macLinked ? "Itish's MacBook Air · in sync" : "sign in to Braino for Mac with this account", on: $macLinked, verb: "Find")
                PermRow(title: "Microphone", why: "so you can talk to me here", on: $mic, verb: "Allow")
                PermRow(title: "Notifications", why: "only for things you asked me to remember", on: $nudges, verb: "Allow")
            }
            .arrive(0.3)
        case .done:
            VStack(spacing: 0) {
                KnowRow(k: "Your name", v: name)
                if !persona.isEmpty { KnowRow(k: "What you do", v: persona) }
                KnowRow(k: "Your Mac", v: macLinked ? "Connected" : "Not yet")
                KnowRow(k: "Call me", v: "Tap and talk, or the Action button", last: true)
            }
            .background(Color.box, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Color.line, lineWidth: 1))
            .arrive(0.4)
        case .story: EmptyView()
        }
    }

    // MARK: The moment playing on each picture
    @ViewBuilder var overlay: some View {
        switch scene.id {
        case "os":
            VStack(spacing: 14) {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text("Affective").font(.display(34)).tracking(-0.8)
                    Text("OS").font(.system(size: 13, weight: .semibold)).tracking(1.5).opacity(0.85).padding(.leading, 4)
                }
                .foregroundStyle(.white).shadow(color: .black.opacity(0.35), radius: 12).arrive(0.2)
                HStack(spacing: 8) {
                    ForEach(Array(["Sees", "Listens", "Acts", "Remembers"].enumerated()), id: \.offset) { i, t in
                        Text(t).font(.system(size: 13, weight: .medium)).padding(.horizontal, 12).frame(height: 30)
                            .background(.ultraThinMaterial, in: Capsule()).foregroundStyle(.white).arrive(0.7 + Double(i) * 0.35)
                    }
                }
            }
        case "braino":
            VStack(spacing: 18) {
                NotchFace(width: 170).shadow(color: .black.opacity(0.35), radius: 20, y: 10).arrive(0.2)
                Text("Hi, I'm Braino.").font(.display(24)).foregroundStyle(.white).shadow(color: .black.opacity(0.4), radius: 10).arrive(0.9)
            }
        case "meetings":
            Sheet {
                HStack(spacing: 6) {
                    Circle().fill(Color.red).frame(width: 7, height: 7)
                    Text("LIVE · Product sync").font(.system(size: 11, weight: .bold)).tracking(1).foregroundStyle(Color.ink3)
                }
                Text("Riya: the deck needs the new numbers.").font(.system(size: 14.5)).arrive(0.6)
                Text("You: I'll send it by Friday.").font(.system(size: 14.5)).arrive(1.4)
                HStack(spacing: 8) {
                    Image(systemName: "pin.fill").font(.system(size: 11))
                    Text("You promised · deck by Friday").font(.system(size: 13.5, weight: .semibold))
                }
                .padding(.horizontal, 10).frame(height: 30).background(Color.well, in: Capsule()).arrive(2.2)
            }
            .foregroundStyle(Color.ink).frame(maxWidth: 330)
        case "do":
            VStack(spacing: 12) {
                Text("“Find me a flight to Mumbai on Friday”").font(.display(19)).foregroundStyle(.white)
                    .padding(.horizontal, 16).padding(.vertical, 10).background(.ultraThinMaterial, in: Capsule()).arrive(0.2)
                Sheet {
                    HStack { Image(systemName: "laptopcomputer"); Text("On your Mac").font(.system(size: 11, weight: .bold)).tracking(1) }.foregroundStyle(Color.ink3)
                    Label("Opened Google Flights", systemImage: "checkmark").font(.system(size: 14.5)).arrive(0.9)
                    Label("Compared 23 flights", systemImage: "checkmark").font(.system(size: 14.5)).arrive(1.5)
                    HStack { Text("IndiGo · 6:05").font(.system(size: 15, weight: .semibold)); Spacer(); Text("₹4,212").font(.display(20)) }.arrive(2.1)
                }
                .foregroundStyle(Color.ink).frame(maxWidth: 300)
            }
        case "memory":
            Sheet {
                Text("What I remember").font(.system(size: 11, weight: .bold)).tracking(1).foregroundStyle(Color.ink3)
                ForEach(Array(["You're vegetarian.", "Riya is your co-founder.", "You like music while you work.", "Mom's birthday is 12 Nov."].enumerated()), id: \.offset) { i, f in
                    HStack { Text(f).font(.display(17)); Spacer(); Text(i == 1 ? "you told me" : "I noticed").font(.system(size: 11)).foregroundStyle(Color.ink3) }
                        .arrive(0.4 + Double(i) * 0.4)
                }
            }
            .foregroundStyle(Color.ink).frame(maxWidth: 320)
        case "connect":
            HStack(spacing: 22) {
                Image(systemName: "iphone").font(.system(size: 40, weight: .light))
                SyncDots()
                Image(systemName: "laptopcomputer").font(.system(size: 46, weight: .light))
            }
            .foregroundStyle(.white).shadow(color: .black.opacity(0.4), radius: 10)
        case "done":
            NotchFace(width: 130).shadow(color: .black.opacity(0.3), radius: 16, y: 8).arrive(0.2)
        default: EmptyView()
        }
    }
}

struct SyncDots: View {
    @State private var phase = 0
    var body: some View {
        HStack(spacing: 7) {
            ForEach(0..<4, id: \.self) { i in Circle().frame(width: 6, height: 6).opacity(i == phase ? 1 : 0.3) }
        }
        .task { while !Task.isCancelled { try? await Task.sleep(for: .milliseconds(260)); withAnimation(.easeInOut(duration: 0.2)) { phase = (phase + 1) % 4 } } }
    }
}

struct PermRow: View {
    let title: String
    let why: String
    @Binding var on: Bool
    var verb = "Allow"
    var body: some View {
        HStack(spacing: 14) {
            Circle().fill(on ? Color.ok : Color.line).frame(width: 10, height: 10)
                .overlay(Circle().stroke(Color.ok.opacity(on ? 0.18 : 0), lineWidth: 8))
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(size: 16, weight: .semibold))
                Text(why).font(.system(size: 13)).foregroundStyle(Color.ink2).lineLimit(2)
            }
            Spacer()
            if on {
                Text(verb == "Find" ? "Connected" : "Allowed").font(.system(size: 13, weight: .semibold)).foregroundStyle(Color.ok)
            } else {
                Button { Haptic.done(); withAnimation(.spring()) { on = true } } label: {
                    Text(verb).font(.system(size: 14, weight: .semibold)).padding(.horizontal, 16).frame(height: 34)
                        .background(Color.ink, in: Capsule()).foregroundStyle(.white)
                }
                .buttonStyle(Press())
            }
        }
        .foregroundStyle(Color.ink)
        .padding(.horizontal, 16).padding(.vertical, 13)
        .background(Color.box, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(on ? Color.ok.opacity(0.45) : Color.line, lineWidth: 1))
    }
}

struct KnowRow: View {
    let k: String
    let v: String
    var last = false
    var body: some View {
        HStack {
            Text(k).font(.system(size: 14)).foregroundStyle(Color.ink3)
            Spacer()
            Text(v).font(.system(size: 15, weight: .semibold)).foregroundStyle(Color.ink)
        }
        .padding(.horizontal, 16).frame(height: 48)
        .overlay(alignment: .bottom) { if !last { Rectangle().fill(Color.line).frame(height: 0.5).padding(.leading, 16) } }
    }
}

/// Wrapping row of pills.
struct Flow: Layout {
    var spacing: CGFloat = 8
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let w = proposal.width ?? 300
        var x: CGFloat = 0, y: CGFloat = 0, row: CGFloat = 0
        for s in subviews {
            let z = s.sizeThatFits(.unspecified)
            if x + z.width > w { x = 0; y += row + spacing; row = 0 }
            x += z.width + spacing; row = max(row, z.height)
        }
        return CGSize(width: w, height: y + row)
    }
    func placeSubviews(in b: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = b.minX, y = b.minY, row: CGFloat = 0
        for s in subviews {
            let z = s.sizeThatFits(.unspecified)
            if x + z.width > b.maxX { x = b.minX; y += row + spacing; row = 0 }
            s.place(at: CGPoint(x: x, y: y), proposal: .unspecified)
            x += z.width + spacing; row = max(row, z.height)
        }
    }
}
