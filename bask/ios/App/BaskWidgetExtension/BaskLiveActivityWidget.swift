//
//  BaskLiveActivityWidget.swift
//  BaskWidgetExtension
//
//  Live Activity views for Lock Screen and Dynamic Island
//

import SwiftUI
import ActivityKit
import WidgetKit

// Format burn time as hours+minutes when >= 60 minutes
private func formatBurnTime(_ minutes: Int) -> String {
    if minutes >= 60 {
        let hours = minutes / 60
        let mins = minutes % 60
        return "\(hours)h \(mins)m"
    }
    return "\(minutes)m"
}

@available(iOS 16.1, *)
struct BaskLiveActivityView: View {
    let context: ActivityViewContext<BaskSessionAttributes>

    var body: some View {
        HStack(spacing: 12) {
            // Sun icon with glow effect
            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: context.state.isPaused ?
                                [Color.orange.opacity(0.3), Color.clear] :
                                [Color.orange.opacity(0.5), Color.orange.opacity(0.1)],
                            center: .center,
                            startRadius: 0,
                            endRadius: 20
                        )
                    )
                    .frame(width: 40, height: 40)

                Image(systemName: "sun.max.fill")
                    .font(.system(size: 24))
                    .foregroundColor(context.state.isPaused ? .orange.opacity(0.6) : .orange)
            }

            VStack(alignment: .leading, spacing: 4) {
                // Status label
                Text(context.state.isPaused ? "Paused" : "Basking")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.secondary)

                // Timer - auto-updates natively
                if context.state.isPaused {
                    Text(formatElapsedTime(context.state.elapsedSecondsAtPause))
                        .font(.title2)
                        .fontWeight(.bold)
                        .monospacedDigit()
                } else {
                    Text(context.state.effectiveStartDate, style: .timer)
                        .font(.title2)
                        .fontWeight(.bold)
                        .monospacedDigit()
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                // IU accumulated
                Text("\(context.state.currentIU) IU")
                    .font(.headline)
                    .foregroundColor(.orange)

                // UV index and burn time
                HStack(spacing: 4) {
                    Text("UV \(String(format: "%.1f", context.attributes.uvIndex))")
                        .font(.caption2)
                    Text("•")
                        .font(.caption2)
                    Text("\(formatBurnTime(context.attributes.timeToBurnMinutes)) before sunburn")
                        .font(.caption2)
                }
                .foregroundColor(.secondary)
            }
        }
        .padding()
        .activityBackgroundTint(Color.black.opacity(0.1))
    }

    private func formatElapsedTime(_ seconds: Int) -> String {
        let minutes = seconds / 60
        let secs = seconds % 60
        return String(format: "%d:%02d", minutes, secs)
    }
}

@available(iOS 16.1, *)
struct BaskLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: BaskSessionAttributes.self) { context in
            // Lock Screen / Banner
            BaskLiveActivityView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.center) {
                    HStack {
                        Image(systemName: "sun.max.fill")
                            .font(.system(size: 20))
                            .foregroundColor(context.state.isPaused ? .orange.opacity(0.6) : .orange)

                        if context.state.isPaused {
                            Text(formatElapsedTime(context.state.elapsedSecondsAtPause))
                                .font(.title2)
                                .fontWeight(.bold)
                                .monospacedDigit()
                        } else {
                            Text(context.state.effectiveStartDate, style: .timer)
                                .font(.title2)
                                .fontWeight(.bold)
                                .monospacedDigit()
                        }

                        Text("\(context.state.currentIU) IU")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.orange)
                    }
                }

                DynamicIslandExpandedRegion(.bottom) {
                    HStack(spacing: 12) {
                        Text("UV \(String(format: "%.1f", context.attributes.uvIndex))")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        Text("•")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        Text("\(formatBurnTime(context.attributes.timeToBurnMinutes)) before sunburn")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            } compactLeading: {
                // Compact leading (small icon on left)
                Image(systemName: "sun.max.fill")
                    .foregroundColor(context.state.isPaused ? .orange.opacity(0.6) : .orange)
            } compactTrailing: {
                // Compact trailing (timer only)
                if context.state.isPaused {
                    Text(formatElapsedTime(context.state.elapsedSecondsAtPause))
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .monospacedDigit()
                } else {
                    Text(context.state.effectiveStartDate, style: .timer)
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .monospacedDigit()
                }
            } minimal: {
                // Minimal (when multiple activities are active)
                Image(systemName: "sun.max.fill")
                    .foregroundColor(context.state.isPaused ? .orange.opacity(0.6) : .orange)
            }
        }
    }

    private func formatElapsedTime(_ seconds: Int) -> String {
        let minutes = seconds / 60
        let secs = seconds % 60
        return String(format: "%d:%02d", minutes, secs)
    }
}
