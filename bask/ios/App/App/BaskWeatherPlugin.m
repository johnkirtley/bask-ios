#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(BaskWeatherPlugin, "BaskWeather",
    CAP_PLUGIN_METHOD(getCurrentWeather, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getHourlyForecast, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getSolarEvents, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getLocationPermissionStatus, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(requestLocationPermission, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getLocationInfo, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(openSettings, CAPPluginReturnPromise);
)
