//
//  BaskLiveActivityPlugin.m
//  Bask
//
//  Objective-C bridge for BaskLiveActivityPlugin
//  Registers plugin methods with Capacitor runtime
//

#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(BaskLiveActivityPlugin, "BaskLiveActivity",
    CAP_PLUGIN_METHOD(isSupported, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(startActivity, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(updateActivity, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(endActivity, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(endAllActivities, CAPPluginReturnPromise);
)
