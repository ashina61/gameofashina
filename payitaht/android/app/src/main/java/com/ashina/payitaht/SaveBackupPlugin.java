package com.ashina.payitaht;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "SaveBackup")
public class SaveBackupPlugin extends Plugin {
    @PluginMethod
    public void save(PluginCall call) {
        String data = call.getString("data");
        String filename = call.getString("filename", "payitaht-yedek.json");
        if (data == null || data.isEmpty()) {
            call.reject("Kayıt yedeği boş.");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, filename);
        startActivityForResult(call, intent, "writeBackup");
    }

    @ActivityCallback
    private void writeBackup(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() == Activity.RESULT_CANCELED) {
            call.resolve(new JSObject().put("cancelled", true));
            return;
        }
        Intent intent = result.getData();
        Uri uri = intent == null ? null : intent.getData();
        String data = call.getString("data");
        if (result.getResultCode() != Activity.RESULT_OK || uri == null || data == null) {
            call.reject("Yedek dosyası seçilemedi.");
            return;
        }
        try (OutputStream stream = getContext().getContentResolver().openOutputStream(uri, "wt")) {
            if (stream == null) throw new java.io.IOException("Dosya açılamadı.");
            stream.write(data.getBytes(StandardCharsets.UTF_8));
            stream.flush();
            call.resolve(new JSObject().put("cancelled", false));
        } catch (Exception error) {
            call.reject("Kayıt yedeği yazılamadı.", error);
        }
    }
}
