// swift-tools-version: 6.0
import PackageDescription

// Braino's on-device dictation helper. A standalone executable so the Electron
// app can spawn it, stream audio in and read transcripts out, without pulling a
// Swift runtime into the main process.
let package = Package(
    name: "BrainoDictate",
    platforms: [.macOS(.v14)],
    dependencies: [
        .package(url: "https://github.com/FluidInference/FluidAudio.git", from: "0.12.0")
    ],
    targets: [
        .executableTarget(
            name: "BrainoDictate",
            dependencies: [.product(name: "FluidAudio", package: "FluidAudio")]
        )
    ]
)
