import SwiftUI
import UIKit

// The Affective system (AFFECTIVE-DESIGN-SYSTEM.md + mac onboard.css), for iPhone.
// Warm paper, black ink, Iowan Old Style for claims, SF for everything else.
extension Color {
    static let paper = Color(hex: 0xF4F2EC)
    static let box = Color(hex: 0xFDFCF8)
    static let well = Color(hex: 0xEBE8DF)      // the grey "Where to?" well
    static let ink = Color(hex: 0x16150F)
    static let ink2 = Color(hex: 0x625F54)
    static let ink3 = Color(hex: 0x918D80)
    static let line = Color(hex: 0xDCD8CB)
    static let lineStrong = Color(hex: 0xC6C1B1)
    static let ok = Color(hex: 0x1F9D63)
    init(hex: UInt32) {
        self.init(red: Double((hex >> 16) & 255) / 255, green: Double((hex >> 8) & 255) / 255, blue: Double(hex & 255) / 255)
    }
}

extension Font {
    static func display(_ size: CGFloat) -> Font { .custom("Iowan Old Style", size: size) }
}

enum Haptic {
    static func tap() { UIImpactFeedbackGenerator(style: .light).impactOccurred() }
    static func soft() { UIImpactFeedbackGenerator(style: .soft).impactOccurred() }
    static func done() { UINotificationFeedbackGenerator().notificationOccurred(.success) }
}

/// The headline. *word* is the payoff, underlined in ink like the site.
/// Words start dim and light up one by one, the way the Mac says them.
struct Headline: View {
    let text: String
    var size: CGFloat = 38
    var lit: Int = .max
    var body: some View {
        var accent = false
        var out = Text("")
        let words = text.split(separator: " ")
        for (i, raw) in words.enumerated() {
            var w = String(raw)
            if w.hasPrefix("*") { accent = true }
            let ends = w.trimmingCharacters(in: CharacterSet(charactersIn: ".?!,")).hasSuffix("*")
            w = w.replacingOccurrences(of: "*", with: "")
            var t = Text(w).foregroundColor(Color.ink.opacity(i < lit ? 1 : 0.14))
            if accent { t = t.underline(true, color: i < lit ? .ink : .ink.opacity(0.14)) }
            out = out + t + Text(i < words.count - 1 ? " " : "")
            if ends { accent = false }
        }
        return out.font(.display(size)).tracking(-size * 0.022).lineSpacing(-2)
            .fixedSize(horizontal: false, vertical: true)
    }
}

/// Lights the headline word by word whenever `key` changes.
struct LitHeadline: View {
    let text: String
    var size: CGFloat = 38
    @State private var lit = 0
    var body: some View {
        Headline(text: text, size: size, lit: lit)
            .animation(.easeOut(duration: 0.35), value: lit)
            .task(id: text) {
                lit = 0
                let n = text.split(separator: " ").count
                for i in 1...max(n, 1) {
                    try? await Task.sleep(for: .milliseconds(i == 1 ? 250 : 170))
                    lit = i
                }
            }
    }
}

struct Kicker: View {
    let text: String
    var body: some View {
        Text(text.uppercased()).font(.system(size: 11.5, weight: .semibold)).tracking(1.8).foregroundStyle(Color.ink3)
    }
}

struct PrimaryButton: View {
    let title: String
    var enabled = true
    var action: () -> Void
    var body: some View {
        Button { Haptic.tap(); action() } label: {
            Text(title).font(.system(size: 17, weight: .semibold)).tracking(-0.2)
                .frame(maxWidth: .infinity).frame(height: 56)
                .background(Color.ink).foregroundStyle(.white).clipShape(Capsule())
        }
        .buttonStyle(Press()).opacity(enabled ? 1 : 0.3).disabled(!enabled)
    }
}

struct GhostButton: View {
    let title: String
    var action: () -> Void
    var body: some View {
        Button { Haptic.tap(); action() } label: {
            Text(title).font(.system(size: 15, weight: .medium))
                .padding(.horizontal, 20).frame(height: 44)
                .overlay(Capsule().stroke(Color.lineStrong, lineWidth: 1)).foregroundStyle(Color.ink)
        }
        .buttonStyle(Press())
    }
}

/// Everything you press gives a little: scale + dim, springy.
struct Press: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.scaleEffect(configuration.isPressed ? 0.97 : 1).opacity(configuration.isPressed ? 0.85 : 1)
            .animation(.spring(response: 0.25, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

/// Pixel art, framed. Pictures get rounded frames, never text.
struct Art: View {
    let name: String
    var body: some View {
        GeometryReader { g in
            Image(name).resizable().scaledToFill().frame(width: g.size.width, height: g.size.height).clipped()
        }
    }
}

/// A card sitting on the art, like the Mac's sheet on the desktop.
struct Sheet<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 8) { content }
            .padding(16)
            .background(Color.box.opacity(0.96))
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .shadow(color: .black.opacity(0.18), radius: 24, y: 12)
    }
}

/// Braino: the notch, with eyes and a smile.
struct NotchFace: View {
    var width: CGFloat = 120
    var smile = true
    @State private var blink = false
    @State private var look: CGFloat = 0
    var body: some View {
        ZStack {
            Capsule().fill(Color.black).frame(width: width, height: width * 0.32)
            VStack(spacing: width * 0.02) {
                HStack(spacing: width * 0.16) {
                    ForEach(0..<2, id: \.self) { _ in
                        Capsule().fill(.white).frame(width: width * 0.06, height: blink ? 1.5 : width * 0.11)
                    }
                }
                .offset(x: look)
                if smile {
                    SmileShape().stroke(.white, style: StrokeStyle(lineWidth: max(1.5, width * 0.022), lineCap: .round))
                        .frame(width: width * 0.16, height: width * 0.045)
                }
            }
        }
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(2.6))
                withAnimation(.easeInOut(duration: 0.08)) { blink = true }
                try? await Task.sleep(for: .milliseconds(120))
                withAnimation(.easeInOut(duration: 0.1)) { blink = false }
                try? await Task.sleep(for: .seconds(1.2))
                withAnimation(.spring(response: 0.5)) { look = [-1, 0, 1].randomElement()! * width * 0.03 }
            }
        }
    }
}

struct SmileShape: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: r.minX, y: r.minY))
        p.addQuadCurve(to: CGPoint(x: r.maxX, y: r.minY), control: CGPoint(x: r.midX, y: r.maxY * 1.8))
        return p
    }
}

/// Lines that arrive one after another, with a delay each.
struct Arrive: ViewModifier {
    let delay: Double
    @State private var on = false
    func body(content: Content) -> some View {
        content.opacity(on ? 1 : 0).offset(y: on ? 0 : 8)
            .onAppear { withAnimation(.spring(response: 0.6, dampingFraction: 0.85).delay(delay)) { on = true } }
    }
}
extension View { func arrive(_ d: Double) -> some View { modifier(Arrive(delay: d)) } }
