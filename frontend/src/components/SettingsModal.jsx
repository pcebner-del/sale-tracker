import { useEffect, useState } from "react";
import { X, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Send } from "lucide-react";
import { fetchSettings, saveSettings, testEmail } from "../api.js";

export default function SettingsModal({ onClose }) {
  const [form, setForm] = useState({
    notification_email:  "",
    gmail_user:          "",
    gmail_app_password:  "",
    check_interval_hours: 4,
    min_discount_percent: 0,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [testing,  setTesting]  = useState(false);
  const [toast,    setToast]    = useState(null);

  useEffect(() => {
    fetchSettings()
      .then(data => setForm(prev => ({
        ...prev,
        notification_email:   data.notification_email  || "",
        gmail_user:           data.gmail_user          || "",
        check_interval_hours: data.check_interval_hours,
        min_discount_percent: data.min_discount_percent,
      })))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings({ ...form, gmail_app_password: form.gmail_app_password || undefined });
      showToast("success", "Settings saved");
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setTesting(true);
    try {
      const res = await testEmail();
      showToast("success", res.message || "Test email sent!");
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setTesting(false);
    }
  };

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 text-gray-900";

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50"
      onClick={e => e.target === e.currentTarget && !saving && onClose()}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-xl max-h-[92dvh] flex flex-col pb-safe">

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 active:bg-gray-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-gray-300" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="px-5 pb-5 space-y-5">

              {/* Alert recipient */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send alerts to
                </label>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={form.notification_email}
                  onChange={set("notification_email")}
                  placeholder="email@example.com"
                  className={inputCls}
                />
              </div>

              {/* Gmail sender */}
              <div className="border border-gray-100 rounded-2xl p-4 space-y-4 bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-0.5">Gmail Sender Account</p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Used to send sale alerts.{" "}
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-rose-500"
                    >
                      Create an App Password
                    </a>{" "}
                    (requires 2FA).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Gmail address
                  </label>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    value={form.gmail_user}
                    onChange={set("gmail_user")}
                    placeholder="yourname@gmail.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 text-sm text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    App Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.gmail_app_password}
                      onChange={set("gmail_app_password")}
                      placeholder="Leave blank to keep existing"
                      autoComplete="new-password"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 text-sm text-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-400"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Test email */}
                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={testing || !form.gmail_user}
                  className="flex items-center gap-2 text-sm text-rose-600 font-medium py-1 disabled:opacity-50"
                >
                  {testing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Send test email
                </button>
              </div>

              {/* Check interval */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Check prices every
                </label>
                <select
                  value={form.check_interval_hours}
                  onChange={e => setForm(f => ({ ...f, check_interval_hours: parseInt(e.target.value) }))}
                  className={inputCls}
                >
                  <option value={1}>1 hour</option>
                  <option value={2}>2 hours</option>
                  <option value={4}>4 hours</option>
                  <option value={6}>6 hours</option>
                  <option value={12}>12 hours</option>
                  <option value={24}>Once a day</option>
                </select>
              </div>

              {/* Min discount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum discount to notify{" "}
                  <span className="text-gray-400 font-normal">({form.min_discount_percent}%)</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={5}
                  value={form.min_discount_percent}
                  onChange={e => setForm(f => ({ ...f, min_discount_percent: parseInt(e.target.value) }))}
                  className="w-full accent-rose-500 h-2"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Any drop</span>
                  <span>50% off</span>
                </div>
              </div>

              {/* Toast */}
              {toast && (
                <div className={`flex items-center gap-2 text-sm rounded-xl p-3.5 ${
                  toast.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                }`}>
                  {toast.type === "success"
                    ? <CheckCircle2 size={16} />
                    : <AlertCircle size={16} />}
                  {toast.msg}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-12 border border-gray-200 rounded-xl text-sm text-gray-600 active:bg-gray-50 font-medium"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-12 bg-gray-900 active:bg-gray-800 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  Save
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
