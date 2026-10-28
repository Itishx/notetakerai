import SwiftUI

@main
struct AffectiveApp: App {
    var body: some Scene {
        WindowGroup { RootView().preferredColorScheme(.light) }
    }
}

struct RootView: View {
    enum Stage { case splash, onboarding, home }
    @State private var stage: Stage = .splash
    @State private var name = "Itish"
    var body: some View {
        ZStack {
            Color.paper.ignoresSafeArea()
            switch stage {
            case .splash: Splash { go(.onboarding) }.transition(.opacity)
            case .onboarding: Onboarding(name: $name) { go(.home) }.transition(.opacity)
            case .home: Home(name: name).transition(.opacity.combined(with: .scale(scale: 1.02)))
            }
        }
    }
    func go(_ s: Stage) { withAnimation(.easeInOut(duration: 0.6)) { stage = s } }
}

/// The A, alone. Then the word grows out of it, the full stop lands, and the
/// picture fades up behind as we hand over to the story.
struct Splash: View {
    var done: () -> Void
    @State private var a = false
    @State private var word = false
    @State private var dot = false
    @State private var line = false
    var body: some View {
        VStack(spacing: 22) {
            HStack(alignment: .firstTextBaseline, spacing: 0) {
                Text("A")
                if word { Text("ffective").transition(.asymmetric(insertion: .opacity.combined(with: .offset(x: -18)), removal: .opacity)) }
                if dot { Text(".").transition(.scale(scale: 0.2).combined(with: .opacity)) }
            }
            .font(.display(word ? 56 : 132)).tracking(word ? -1.6 : -2)
            .foregroundStyle(Color.ink)
            .opacity(a ? 1 : 0).blur(radius: a ? 0 : 12).scaleEffect(a ? 1 : 0.94)

            Text("A computer that finally understands you.")
                .font(.system(size: 15)).foregroundStyle(Color.ink2)
                .opacity(line ? 1 : 0).offset(y: line ? 0 : 6)
        }
        .task {
            withAnimation(.easeOut(duration: 1.0)) { a = true }
            try? await Task.sleep(for: .seconds(1.4))
            Haptic.soft()
            withAnimation(.spring(response: 0.75, dampingFraction: 0.88)) { word = true }
            try? await Task.sleep(for: .seconds(0.55))
            withAnimation(.spring(response: 0.35, dampingFraction: 0.55)) { dot = true }
            Haptic.tap()
            try? await Task.sleep(for: .seconds(0.4))
            withAnimation(.easeOut(duration: 0.7)) { line = true }
            try? await Task.sleep(for: .seconds(1.6))
            done()
        }
    }
}
