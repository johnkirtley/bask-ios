//
//  BaskWidgetExtensionBundle.swift
//  BaskWidgetExtension
//
//  Widget bundle entry point
//

import SwiftUI
import WidgetKit

@main
@available(iOS 16.1, *)
struct BaskWidgetExtensionBundle: WidgetBundle {
    var body: some Widget {
        BaskLiveActivity()
    }
}
