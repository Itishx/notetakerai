import SwiftUI

struct Home: View {
    let name: String
    @State private var tab = 0
    @State private var talking = false
    var body: some View {
        TabView(selection: $tab) {
            Today(name: name, talk: { talking = true }).tabItem { Label("Today", systemImage: "sun.horizon.fill") }.tag(0)
            Notes().tabItem { Label("Notes", systemImage: "text.alignleft") }.tag(1)
            Memory().tabItem { Label("Memory", systemImage: "sparkles") }.tag(2)
            MacTab().tabItem { Label("Mac", systemImage: "laptopcomputer") }.tag(3)
        }
        .tint(.ink)
        .fullScreenCover(isPresented: $talking) { Talk() }
    }
}

// MARK: - Today: picture on top, everything else on a sheet, the way Uber leads with the map
struct Today: View {
    let name: String
    var talk: () -> Void
    @State private var sent = false
    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 0) {
                ZStack(alignment: .bottomLeading) {
                    Art(name: "affective-hero").frame(height: 300)
                    LinearGradient(colors: [.black.opacity(0.25), .clear, .clear], startPoint: .top, endPoint: .bottom)
                    HStack {
                        Image("logo").renderingMode(.template).resizable().scaledToFit().frame(height: 17).foregroundStyle(.white)
                        Spacer()
                        Text(String(name.prefix(1))).font(.display(17)).frame(width: 36, height: 36)
                            .background(.ultraThinMaterial, in: Circle()).foregroundStyle(.white)
                    }
                    .padding(.horizontal, 20).frame(maxHeight: .infinity, alignment: .top).padding(.top, 60)
                }
                .frame(height: 300)

                VStack(alignment: .leading, spacing: 0) {
                    Kicker(text: "Saturday, 18 October").padding(.bottom, 10)
                    Headline(text: "Good morning, \(name). One thing is *due.*", size: 34).padding(.bottom, 22)

                    // The "Where to?" bar
                    Button(action: { Haptic.tap(); talk() }) {
                        HStack(spacing: 12) {
                            Image(systemName: "waveform").font(.system(size: 18, weight: .semibold))
                            Text("Ask Braino anything").font(.system(size: 18, weight: .semibold)).tracking(-0.3)
                            Spacer()
                            HStack(spacing: 5) { Image(systemName: "laptopcomputer").font(.system(size: 12)); Text("On Mac").font(.system(size: 13, weight: .semibold)) }
                                .padding(.horizontal, 12).frame(height: 32).background(Color.box, in: Capsule())
                        }
                        .foregroundStyle(Color.ink).padding(.horizontal, 18).frame(height: 60)
                        .background(Color.well, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                    }
                    .buttonStyle(Press()).padding(.bottom, 16)

                    // Suggestions, like Uber's Ride / Food / Package tiles
                    HStack(spacing: 10) {
                        Tile(icon: "mic.fill", label: "Take notes")
                        Tile(icon: "message.fill", label: "Message")
                        Tile(icon: "play.fill", label: "Play")
                        Tile(icon: "airplane", label: "Find")
                    }
                    .padding(.bottom, 32)

                    Section(title: "Needs you") {
                        VStack(alignment: .leading, spacing: 14) {
                            HStack(spacing: 10) {
                                NotchFace(width: 46, smile: false)
                                VStack(alignment: .leading, spacing: 1) {
                                    Text("Ready to send on WhatsApp").font(.system(size: 14, weight: .semibold))
                                    Text("To Riya Khurana · from your Mac").font(.system(size: 12.5)).foregroundStyle(Color.ink3)
                                }
                            }
                            Text("“New numbers are in the deck. Sending the full version tonight.”").font(.display(20)).lineSpacing(1)
                            if sent {
                                Label("Sent. Riya has it.", systemImage: "checkmark.circle.fill").font(.system(size: 15, weight: .semibold)).foregroundStyle(Color.ok)
                                    .transition(.opacity.combined(with: .scale(scale: 0.95)))
                            } else {
                                HStack(spacing: 10) {
                                    Button { Haptic.done(); withAnimation(.spring()) { sent = true } } label: {
                                        Text("Send").font(.system(size: 15, weight: .semibold)).frame(maxWidth: .infinity).frame(height: 46)
                                            .background(Color.ink, in: Capsule()).foregroundStyle(.white)
                                    }.buttonStyle(Press())
                                    Button {} label: {
                                        Text("Edit").font(.system(size: 15, weight: .semibold)).frame(maxWidth: .infinity).frame(height: 46)
                                            .overlay(Capsule().stroke(Color.lineStrong)).foregroundStyle(Color.ink)
                                    }.buttonStyle(Press())
                                }
                            }
                        }
                        .foregroundStyle(Color.ink).padding(18)
                        .background(Color.box, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 22, style: .continuous).stroke(Color.line, lineWidth: 1))
                    }

                    Section(title: "Your day") {
                        VStack(spacing: 0) {
                            DayRow(time: "9:30", title: "Venture Building · Lecture 6", sub: "I'll write it down live")
                            DayRow(time: "12:00", title: "Market sizing is due at 2", sub: "From Lecture 5", hot: true)
                            DayRow(time: "5:50", title: "Call with Arjun", sub: "Google Meet · I'll take notes", last: true)
                        }
                        .background(Color.box, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(Color.line, lineWidth: 1))
                    }

                    Section(title: "You promised") {
                        HStack(spacing: 14) {
                            Image(systemName: "pin.fill").font(.system(size: 14)).frame(width: 40, height: 40).background(Color.well, in: Circle())
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Deck to Riya by Friday").font(.display(18))
                                Text("You said it in Product sync, Thursday").font(.system(size: 13)).foregroundStyle(Color.ink3)
                            }
                            Spacer()
                        }
                        .foregroundStyle(Color.ink)
                    }
                }
                .padding(.horizontal, 20).padding(.top, 26).padding(.bottom, 40)
                .background(Color.paper)
                .clipShape(UnevenRoundedRectangle(topLeadingRadius: 30, topTrailingRadius: 30, style: .continuous))
                .offset(y: -30).padding(.bottom, -30)
            }
        }
        .background(Color.paper)
        .ignoresSafeArea(edges: .top)
    }
}

struct Tile: View {
    let icon: String
    let label: String
    var body: some View {
        Button { Haptic.tap() } label: {
            VStack(spacing: 8) {
                Image(systemName: icon).font(.system(size: 20, weight: .semibold))
                Text(label).font(.system(size: 12.5, weight: .semibold))
            }
            .foregroundStyle(Color.ink).frame(maxWidth: .infinity).frame(height: 78)
            .background(Color.well, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .buttonStyle(Press())
    }
}

struct Section<Content: View>: View {
    let title: String
    @ViewBuilder var content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title).font(.system(size: 20, weight: .bold)).tracking(-0.4).foregroundStyle(Color.ink)
            content
        }
        .padding(.bottom, 30)
    }
}

struct DayRow: View {
    let time: String
    let title: String
    let sub: String
    var hot = false
    var last = false
    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            Text(time).font(.system(size: 13, weight: .semibold).monospacedDigit()).foregroundStyle(Color.ink3).frame(width: 42, alignment: .leading).padding(.top, 2)
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.system(size: 16, weight: .semibold)).foregroundStyle(Color.ink)
                Text(sub).font(.system(size: 13)).foregroundStyle(hot ? Color(hex: 0xC2410C) : Color.ink2)
            }
            Spacer()
            Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold)).foregroundStyle(Color.lineStrong).padding(.top, 4)
        }
        .padding(16)
        .overlay(alignment: .bottom) { if !last { Rectangle().fill(Color.line).frame(height: 0.5).padding(.leading, 72) } }
    }
}

// MARK: - Talk: the notch grows into the whole screen
struct Talk: View {
    @Environment(\.dismiss) private var dismiss
    @State private var phase = 0
    @State private var level: [CGFloat] = Array(repeating: 0.2, count: 28)
    let said = "Find me a flight to Mumbai on Friday morning"
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            VStack(spacing: 0) {
                HStack {
                    Button { Haptic.tap(); dismiss() } label: {
                        Image(systemName: "xmark").font(.system(size: 15, weight: .semibold)).frame(width: 40, height: 40)
                            .background(Color.white.opacity(0.12), in: Circle()).foregroundStyle(.white)
                    }
                    Spacer()
                    Text(phase < 2 ? "Listening" : "On your Mac").font(.system(size: 13, weight: .semibold)).foregroundStyle(.white.opacity(0.55))
                    Spacer()
                    Color.clear.frame(width: 40, height: 40)
                }
                .padding(.horizontal, 20)

                Spacer()
                NotchFace(width: 210)
                Spacer().frame(height: 50)

                Group {
                    if phase == 0 {
                        Text("Go ahead, I'm listening.").font(.display(30)).foregroundStyle(.white.opacity(0.5))
                    } else {
                        LitWhite(text: said)
                    }
                }
                .multilineTextAlignment(.center).padding(.horizontal, 32).frame(height: 120)

                if phase >= 2 {
                    VStack(alignment: .leading, spacing: 10) {
                        Label("Opened Google Flights", systemImage: "checkmark").arrive(0.1)
                        Label("Compared 23 flights", systemImage: "checkmark").arrive(0.7)
                        HStack { Text("IndiGo · 6:05 · BLR → BOM").font(.system(size: 15, weight: .semibold)); Spacer(); Text("₹4,212").font(.display(20)) }.arrive(1.3)
                    }
                    .font(.system(size: 15)).foregroundStyle(.white)
                    .padding(18).background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                    .padding(.horizontal, 24)
                }
                Spacer()

                HStack(spacing: 3) {
                    ForEach(0..<level.count, id: \.self) { i in
                        Capsule().fill(.white.opacity(phase < 2 ? 0.9 : 0.25)).frame(width: 3, height: 6 + level[i] * 34)
                    }
                }
                .frame(height: 44).padding(.bottom, 30)
            }
            .padding(.vertical, 12)
        }
        .task {
            Task { while !Task.isCancelled { try? await Task.sleep(for: .milliseconds(110)); withAnimation(.easeOut(duration: 0.1)) { level = level.map { _ in phase < 2 ? .random(in: 0.05...1) : 0.08 } } } }
            try? await Task.sleep(for: .seconds(1.3)); withAnimation { phase = 1 }
            try? await Task.sleep(for: .seconds(2.6)); Haptic.soft(); withAnimation(.spring()) { phase = 2 }
        }
    }
}

struct LitWhite: View {
    let text: String
    @State private var lit = 0
    var body: some View {
        let words = text.split(separator: " ")
        words.enumerated().reduce(Text("")) { acc, w in
            acc + Text(String(w.element) + " ").foregroundColor(.white.opacity(w.offset < lit ? 1 : 0.2))
        }
        .font(.display(30)).tracking(-0.6)
        .task { for i in 1...words.count { try? await Task.sleep(for: .milliseconds(200)); withAnimation(.easeOut(duration: 0.25)) { lit = i } } }
    }
}

// MARK: - Notes
struct Notes: View {
    let items: [(String, String, String, String)] = [
        ("os-voice", "Product sync", "Thursday · 32 min", "Riya, Arjun · 2 promises"),
        ("os-senses", "Venture Building · Lecture 6", "Wednesday · 1 h 24 min", "Customer discovery"),
        ("os-memory", "Call with Dad", "Tuesday · 12 min", "Trip in December"),
        ("os-hands", "Venture Building · Lecture 5", "Monday · 1 h 10 min", "Market sizing"),
    ]
    var body: some View {
        Page(kicker: "Notes", title: "Everything, written *down.*") {
            VStack(spacing: 14) {
                ForEach(items, id: \.1) { i in
                    HStack(spacing: 14) {
                        Art(name: i.0).frame(width: 64, height: 64).clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        VStack(alignment: .leading, spacing: 3) {
                            Text(i.1).font(.display(18)).foregroundStyle(Color.ink).lineLimit(1)
                            Text(i.2).font(.system(size: 13)).foregroundStyle(Color.ink3)
                            Text(i.3).font(.system(size: 13, weight: .medium)).foregroundStyle(Color.ink2)
                        }
                        Spacer()
                    }
                    Rectangle().fill(Color.line).frame(height: 0.5)
                }
            }
        }
    }
}

// MARK: - Memory
struct Memory: View {
    let groups: [(String, [(String, String)])] = [
        ("About you", [("You're vegetarian.", "I noticed"), ("You like music while you work.", "I noticed"), ("You study at Mesa School of Business.", "you told me")]),
        ("Your people", [("Riya is your co-founder.", "you told me"), ("Arjun is your mentor.", "I noticed"), ("Mom's birthday is 12 Nov.", "you told me")]),
    ]
    var body: some View {
        Page(kicker: "Memory", title: "What I *know* about you.") {
            Text("The same on your Mac. Tap anything to change it, or swipe to forget it.")
                .font(.system(size: 15)).foregroundStyle(Color.ink2).padding(.bottom, 24)
            ForEach(groups, id: \.0) { g in
                Section(title: g.0) {
                    VStack(spacing: 0) {
                        ForEach(Array(g.1.enumerated()), id: \.offset) { i, f in
                            HStack {
                                Text(f.0).font(.display(17)).foregroundStyle(Color.ink)
                                Spacer()
                                Text(f.1).font(.system(size: 12)).foregroundStyle(Color.ink3)
                            }
                            .padding(16)
                            .overlay(alignment: .bottom) { if i < g.1.count - 1 { Rectangle().fill(Color.line).frame(height: 0.5).padding(.leading, 16) } }
                        }
                    }
                    .background(Color.box, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(Color.line, lineWidth: 1))
                }
            }
        }
    }
}

// MARK: - Mac
struct MacTab: View {
    var body: some View {
        Page(kicker: "Your Mac", title: "Awake, and *in sync.*") {
            ZStack(alignment: .top) {
                Art(name: "affective-hero").frame(height: 200)
                    .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                NotchFace(width: 96).offset(y: -2)
            }
            .padding(10)
            .background(Color.ink, in: RoundedRectangle(cornerRadius: 28, style: .continuous))
            .padding(.bottom, 14)
            HStack(spacing: 8) {
                Circle().fill(Color.ok).frame(width: 8, height: 8)
                Text("Itish's MacBook Air").font(.system(size: 15, weight: .semibold))
                Spacer()
                Text("Synced just now").font(.system(size: 13)).foregroundStyle(Color.ink3)
            }
            .foregroundStyle(Color.ink).padding(.bottom, 32)

            Section(title: "Sent from your phone") {
                VStack(spacing: 0) {
                    JobRow(done: true, title: "Find a flight to Mumbai", sub: "Cheapest: IndiGo, ₹4,212")
                    JobRow(done: false, title: "Send deck notes to Riya", sub: "Waiting for your OK")
                    JobRow(done: true, title: "Play Billie Jean", sub: "Playing on Spotify", last: true)
                }
                .background(Color.box, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(Color.line, lineWidth: 1))
            }
        }
    }
}

struct JobRow: View {
    let done: Bool
    let title: String
    let sub: String
    var last = false
    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: done ? "checkmark" : "clock").font(.system(size: 13, weight: .bold))
                .frame(width: 34, height: 34).background(done ? Color.well : Color.ink, in: Circle())
                .foregroundStyle(done ? Color.ink : .white)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(size: 16, weight: .semibold))
                Text(sub).font(.system(size: 13)).foregroundStyle(Color.ink2)
            }
            Spacer()
        }
        .foregroundStyle(Color.ink).padding(14)
        .overlay(alignment: .bottom) { if !last { Rectangle().fill(Color.line).frame(height: 0.5).padding(.leading, 62) } }
    }
}

struct Page<Content: View>: View {
    let kicker: String
    let title: String
    @ViewBuilder var content: Content
    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 0) {
                Kicker(text: kicker).padding(.bottom, 10)
                Headline(text: title, size: 36).padding(.bottom, 26)
                content
            }
            .padding(.horizontal, 20).padding(.top, 20).padding(.bottom, 40)
        }
        .background(Color.paper)
    }
}
