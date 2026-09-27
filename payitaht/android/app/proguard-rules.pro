# Payitaht Adaları — production R8 rules.
# Capacitor'ın WebView ↔ native köprüsünde JS tarafından çağrılan üyeler isim
# bazlıdır; JavascriptInterface anotasyonlu metotlar küçültmede korunmalıdır.

-keepattributes *Annotation*
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Capacitor plugin metadata/bridge sınıfları küçük bir yüzey; oyunun JS bundle'ını
# etkilemez. Native tarafta agresif shrink sırasında plugin keşfini güvenli tut.
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class com.getcapacitor.Bridge { *; }
-keep class com.getcapacitor.BridgeActivity { *; }
-keep class com.getcapacitor.PluginHandle { *; }

# Crash stack trace'lerinde kaynak satırı kalır; release teşhisi yapılabilir.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
