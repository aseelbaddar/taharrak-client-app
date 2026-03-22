import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gqpegjnuxibxlszhnsnh.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxcGVnam51eGlieGxzemhuc25oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODE0MDAsImV4cCI6MjA4OTc1NzQwMH0.iIoqTU83ERUO60jeLZ9CCKDU1xzf6WE4Tt-cMxFSNHo";
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

const flattenDays = (weeks) => {
  const f = [];
  weeks?.forEach((w, wi) => w.days?.forEach((d, di) => f.push({ week: w, weekIndex: wi, day: d, dayIndex: di, globalIndex: f.length })));
  return f;
};

const getVideoId = (url) => {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("?")[0];
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
  } catch {}
  return null;
};

const T = {
  login: { en: "Login", ar: "دخول" },
  username: { en: "Username", ar: "اسم المستخدم" },
  password: { en: "Password", ar: "كلمة المرور" },
  invalidCreds: { en: "Invalid credentials", ar: "اسم المستخدم أو كلمة المرور غلط" },
  myProgram: { en: "My Program", ar: "برنامجي" },
  myLogs: { en: "My Logs", ar: "سجلاتي" },
  noProgram: { en: "No program assigned yet.\nYour coach will assign one soon 💪", ar: "ما في برنامج بعد.\nالمدرب بيضيف لك قريباً 💪" },
  programComplete: { en: "Program Complete! 🏆", ar: "انتهيت من البرنامج! 🏆" },
  week: { en: "Week", ar: "الأسبوع" },
  day: { en: "Day", ar: "اليوم" },
  of: { en: "of", ar: "من" },
  daysCompleted: { en: "days completed", ar: "يوم مكتمل" },
  sets: { en: "Sets", ar: "سيتات" },
  reps: { en: "Reps", ar: "تكرار" },
  rest: { en: "Rest", ar: "راحة" },
  watchVideo: { en: "Watch Video", ar: "شاهد الفيديو" },
  coachNote: { en: "Coach Note", ar: "ملاحظة المدرب" },
  lastSession: { en: "Last", ar: "آخر مرة" },
  set: { en: "Set", ar: "سيت" },
  done: { en: "Done", ar: "خلصت" },
  skip: { en: "Skip", ar: "تخطى" },
  restTimer: { en: "Rest Timer", ar: "وقت الراحة" },
  restDone: { en: "Rest done! Time for next set 💪", ar: "انتهت الراحة! جاهز للسيت القادم 💪" },
  markDone: { en: "✓ Mark Day as Complete", ar: "✓ أنهيت اليوم" },
  dayComplete: { en: "Day Complete!", ar: "أنهيت اليوم!" },
  nextDay: { en: "Next Day →", ar: "→ اليوم التالي" },
  restDay: { en: "Rest Day 😴", ar: "يوم راحة 😴" },
  noLogs: { en: "No logs yet. Start your first workout!", ar: "ما في سجلات بعد. ابدأ أول تمرين!" },
  logout: { en: "Logout", ar: "خروج" },
  noVideo: { en: "No video", ar: "لا يوجد فيديو" },
};

const t = (key, lang) => T[key]?.[lang] || T[key]?.en || key;

export default function ClientApp() {
  const [lang, setLang] = useState("ar");
  const [client, setClient] = useState(null);
  const [program, setProgram] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activeTab, setActiveTab] = useState("program");
  const [liveReps, setLiveReps] = useState({});
  const [restTimer, setRestTimer] = useState(null);
  const [notification, setNotification] = useState("");
  const [logs, setLogs] = useState([]);

  const notify = (msg) => { setNotification(msg); setTimeout(() => setNotification(""), 3000); };
  const isRTL = lang === "ar";

  useEffect(() => { if (client?.assigned_program) loadProgram(client.assigned_program); }, [client]);
  useEffect(() => { if (client) loadLogs(); }, [client]);

  const loadProgram = async (progId) => {
    const { data } = await sb.from("programs").select("*").eq("id", progId).single();
    setProgram(data);
    const exIds = [];
    data?.weeks?.forEach(w => w.days?.forEach(d => d.exercises?.forEach(e => { if (!exIds.includes(e.id)) exIds.push(e.id); })));
    if (exIds.length) {
      const { data: exData } = await sb.from("exercises").select("*").in("id", exIds);
      setExercises(exData || []);
    }
  };

  const loadLogs = async () => {
    const { data } = await sb.from("logs").select("*").eq("client_id", client.id).order("created_at", { ascending: false });
    setLogs(data || []);
  };

  const login = async () => {
    const { data } = await sb.from("clients").select("*").eq("username", username).eq("password", password).single();
    if (data) { setClient(data); setLoginError(""); }
    else setLoginError(t("invalidCreds", lang));
  };

  const startRestTimer = (key, seconds) => {
    if (restTimer?.intervalId) clearInterval(restTimer.intervalId);
    let remaining = seconds;
    const intervalId = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) { clearInterval(intervalId); setRestTimer(null); notify(t("restDone", lang)); }
      else setRestTimer(prev => prev ? { ...prev, remaining } : null);
    }, 1000);
    setRestTimer({ key, total: seconds, remaining, intervalId });
  };

  const saveRep = async (exItem, gi, si, newVal, newReps) => {
    const numSets = parseInt(exItem.sets) || 1;
    const sets = Array.from({ length: numSets }).map((_, idx) => ({
      reps: idx === si ? newVal : (newReps[`${exItem.id}-${gi}-${idx}`] || ""),
      weight: ""
    }));
    const today = new Date().toLocaleDateString();
    const existing = logs.find(l => l.exercise_id === exItem.id && l.global_day_index === gi && l.log_date === today);
    if (existing) {
      await sb.from("logs").update({ sets }).eq("id", existing.id);
    } else {
      await sb.from("logs").insert({ client_id: client.id, exercise_id: exItem.id, global_day_index: gi, program_id: client.assigned_program, sets, log_date: today });
    }
    await loadLogs();
  };

  const isDayComplete = (flatDay) => {
    const gi = flatDay.globalIndex;
    if (client.completed_days?.includes(gi)) return true;
    const day = flatDay.day;
    if (!day.exercises?.length) return false;
    return day.exercises.every(exItem => {
      const numSets = parseInt(exItem.sets) || 1;
      return Array.from({ length: numSets }).every((_, si) => {
        const val = liveReps[`${exItem.id}-${gi}-${si}`];
        return val !== undefined && val !== "" && !isNaN(parseInt(val));
      });
    });
  };

  const markDayDone = async (gi) => {
    const completed = [...(client.completed_days || [])];
    if (!completed.includes(gi)) completed.push(gi);
    const newIdx = Math.max(client.current_day_index || 0, gi + 1);
    await sb.from("clients").update({ completed_days: completed, current_day_index: newIdx }).eq("id", client.id);
    setClient(prev => ({ ...prev, completed_days: completed, current_day_index: newIdx }));
    notify(t("dayComplete", lang) + " 🔥");
  };

  const goNextDay = async (currentIdx) => {
    const newIdx = currentIdx + 1;
    await sb.from("clients").update({ current_day_index: newIdx }).eq("id", client.id);
    setClient(prev => ({ ...prev, current_day_index: newIdx }));
    setLiveReps({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── LOGIN ──
  if (!client) {
    return (
      <div style={{ ...cs.root, direction: isRTL ? "rtl" : "ltr" }}>
        <div style={cs.loginWrap}>
          <div style={cs.logo}>
            <span style={cs.logoAr}>تحرك</span>
            <span style={cs.logoEn}>TAHARRAK</span>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 20 }}>
            <button style={lang === "ar" ? cs.langActive : cs.langBtn} onClick={() => setLang("ar")}>العربية</button>
            <button style={lang === "en" ? cs.langActive : cs.langBtn} onClick={() => setLang("en")}>English</button>
          </div>
          <div style={cs.form}>
            <p style={cs.loginLabel}>{t("username", lang)}</p>
            <input style={cs.input} placeholder={t("username", lang)} value={username} onChange={e => setUsername(e.target.value)} />
            <p style={cs.loginLabel}>{t("password", lang)}</p>
            <input style={cs.input} type="password" placeholder={t("password", lang)} value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") login(); }} />
            {loginError && <p style={cs.error}>{loginError}</p>}
            <button style={cs.btn} onClick={login}>{t("login", lang)}</button>
          </div>
        </div>
      </div>
    );
  }

  const flatDays = program ? flattenDays(program.weeks) : [];
  const totalDays = flatDays.length;
  const currentIdx = client.current_day_index || 0;
  const currentFlatDay = flatDays[currentIdx] || null;
  const isLastDay = currentIdx >= totalDays - 1;

  return (
    <div style={{ ...cs.root, direction: isRTL ? "rtl" : "ltr" }}>
      {notification && <div style={cs.notification}>{notification}</div>}

      {/* Header */}
      <div style={cs.header}>
        <div>
          <div style={cs.logo2}>تحرك <span style={{ fontSize: 12, color: "#1fe5ff" }}>TAHARRAK</span></div>
          <div style={{ color: "#e0e0e0", fontSize: 13 }}>{client.name}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button style={lang === "ar" ? cs.langActive : cs.langBtn} onClick={() => setLang("ar")}>ع</button>
          <button style={lang === "en" ? cs.langActive : cs.langBtn} onClick={() => setLang("en")}>EN</button>
          <button style={cs.logoutBtn} onClick={() => { setClient(null); setUsername(""); setPassword(""); setLiveReps({}); if (restTimer?.intervalId) clearInterval(restTimer.intervalId); setRestTimer(null); }}>{t("logout", lang)}</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={cs.tabRow}>
        <button style={activeTab === "program" ? cs.tabActive : cs.tabInactive} onClick={() => setActiveTab("program")}>{t("myProgram", lang)}</button>
        <button style={activeTab === "log" ? cs.tabActive : cs.tabInactive} onClick={() => setActiveTab("log")}>{t("myLogs", lang)}</button>
      </div>

      {/* Program Tab */}
      {activeTab === "program" && (
        <div style={cs.content}>
          {!program ? (
            <div style={cs.empty}>{t("noProgram", lang).split("\n").map((l, i) => <div key={i}>{l}</div>)}</div>
          ) : currentIdx >= totalDays ? (
            <div style={cs.empty}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
              <div style={{ color: "#1fe5ff", fontWeight: 800, fontSize: 20 }}>{t("programComplete", lang)}</div>
              <div style={{ marginTop: 8, color: "#e0e0e0" }}>{totalDays} {t("daysCompleted", lang)}</div>
            </div>
          ) : (
            <>
              {/* Progress */}
              <div style={cs.progressCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <div style={{ color: "#1fe5ff", fontWeight: 800, fontSize: 16 }}>{program.name}</div>
                    <div style={{ color: "#e0e0e0", fontSize: 13, marginTop: 2 }}>
                      {t("week", lang)} {(currentFlatDay?.weekIndex || 0) + 1} · {currentFlatDay?.day.label} · {t("day", lang)} {currentIdx + 1} {t("of", lang)} {totalDays}
                    </div>
                  </div>
                  <div style={cs.progressRing}>
                    <span style={{ color: "#1fe5ff", fontWeight: 900, fontSize: 14 }}>{Math.round((currentIdx / totalDays) * 100)}%</span>
                  </div>
                </div>
                <div style={cs.progressTrack}><div style={{ ...cs.progressFill, width: `${(currentIdx / totalDays) * 100}%` }} /></div>
                <div style={{ color: "#a0a0a0", fontSize: 11, marginTop: 6 }}>{currentIdx} {t("of", lang)} {totalDays} {t("daysCompleted", lang)}</div>
              </div>

              {/* Day header */}
              <div style={cs.dayHeader}>{currentFlatDay?.week.label} — {currentFlatDay?.day.label}</div>

              {currentFlatDay?.day.exercises?.length === 0 && <div style={cs.empty}>{t("restDay", lang)}</div>}

              {/* Exercises */}
              {currentFlatDay?.day.exercises?.map((exItem, ei) => {
                const ex = exercises.find(e => e.id === exItem.id);
                if (!ex) return null;
                const gi = currentFlatDay.globalIndex;
                const videoId = getVideoId(ex.video_url);
                const thumbUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
                const exLogs = logs.filter(l => l.exercise_id === exItem.id && l.global_day_index === gi);

                return (
                  <div key={ei} style={cs.exCard}>
                    <div style={cs.exIndex}>{ei + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={cs.exCardInner}>
                        {/* Video */}
                        <div style={cs.videoCol}>
                          {thumbUrl ? (
                            <a href={ex.video_url} target="_blank" rel="noreferrer" style={cs.thumbWrap}>
                              <img src={thumbUrl} alt={ex.name} style={cs.thumbImg} />
                              <div style={cs.playOverlay}><div style={cs.playBtn}>&#9654;</div></div>
                            </a>
                          ) : ex.video_url ? (
                            <a href={ex.video_url} target="_blank" rel="noreferrer" style={cs.videoFallback}>
                              <span style={{ fontSize: 24 }}>&#9654;</span>
                              <span style={{ fontSize: 11, color: "#e0e0e0", marginTop: 4 }}>{t("watchVideo", lang)}</span>
                            </a>
                          ) : (
                            <div style={cs.noVideo}><span style={{ color: "#a0a0a0", fontSize: 11 }}>{t("noVideo", lang)}</span></div>
                          )}
                        </div>
                        {/* Info */}
                        <div style={cs.infoCol}>
                          <div style={cs.exName}>{ex.name}</div>
                          <div style={cs.exCat}>{ex.category}</div>
                          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                            {exItem.sets && <div style={cs.statBox}><div style={cs.statValue}>{exItem.sets}</div><div style={cs.statLabel}>{t("sets", lang)}</div></div>}
                            {exItem.reps && <div style={cs.statBox}><div style={cs.statValue}>{exItem.reps}</div><div style={cs.statLabel}>{t("reps", lang)}</div></div>}
                            {exItem.rest && <div style={cs.statBox}><div style={cs.statValue}>{exItem.rest}s</div><div style={cs.statLabel}>{t("rest", lang)}</div></div>}
                          </div>
                          {ex.description && <div style={{ color: "#e0e0e0", fontSize: 12, marginTop: 8 }}>{ex.description}</div>}
                          {exItem.note && (
                            <div style={cs.coachNote}>
                              <span style={cs.coachNoteLabel}>📋 {t("coachNote", lang)}</span>
                              <span style={{ color: "#fff", fontSize: 13 }}>{exItem.note}</span>
                            </div>
                          )}
                          {exLogs.length > 0 && (
                            <div style={cs.lastLog}>{t("lastSession", lang)}: {exLogs[0].sets?.map(s => `${s.reps} reps`).join(" | ")}</div>
                          )}
                        </div>
                      </div>

                      {/* Sets */}
                      {exItem.sets && (
                        <div style={{ marginTop: 12, borderTop: "1px solid #333a4d", paddingTop: 10 }}>
                          {Array.from({ length: parseInt(exItem.sets) || 1 }).map((_, si) => {
                            const key = `${exItem.id}-${gi}-${si}`;
                            const lastLog = exLogs.length > 0 ? exLogs[0].sets?.[si] : null;
                            const val = liveReps[key] !== undefined ? liveReps[key] : "";
                            const saved = val !== "" && !isNaN(parseInt(val));
                            const isTimerActive = restTimer?.key === key;
                            return (
                              <div key={si}>
                                <div style={cs.setRow}>
                                  <div style={cs.setLabel}>{t("set", lang)} {si + 1}</div>
                                  {exItem.reps && <div style={cs.setTarget}>{exItem.reps} {t("reps", lang)}</div>}
                                  {lastLog && <div style={cs.setLast}>{t("lastSession", lang)}: {lastLog.reps}</div>}
                                  <div style={cs.setInputWrap}>
                                    <input
                                      style={{ ...cs.setInput, borderColor: saved ? "#4ade80" : "#3d4560" }}
                                      type="number" min="0" placeholder="—" value={val}
                                      onChange={e => {
                                        const newVal = e.target.value;
                                        const newReps = { ...liveReps, [key]: newVal };
                                        setLiveReps(newReps);
                                        saveRep(exItem, gi, si, newVal, newReps);
                                      }}
                                    />
                                    <span style={cs.setUnit}>{t("reps", lang)}</span>
                                  </div>
                                  {saved && !isTimerActive && (
                                    <button style={cs.doneBtn} onClick={() => startRestTimer(key, parseInt(exItem.rest) || 60)}>{t("done", lang)}</button>
                                  )}
                                  {saved && <div style={cs.setDone}>✓</div>}
                                </div>
                                {isTimerActive && (
                                  <div style={cs.timerBar}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                      <span style={{ color: "#1fe5ff", fontWeight: 700, fontSize: 13 }}>⏱ {t("restTimer", lang)}</span>
                                      <span style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>{Math.floor(restTimer.remaining / 60)}:{String(restTimer.remaining % 60).padStart(2, "0")}</span>
                                      <button style={cs.skipBtn} onClick={() => { clearInterval(restTimer.intervalId); setRestTimer(null); }}>{t("skip", lang)}</button>
                                    </div>
                                    <div style={cs.timerTrack}><div style={{ ...cs.timerFill, width: `${(restTimer.remaining / restTimer.total) * 100}%` }} /></div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Complete Day */}
              {currentFlatDay?.day.exercises?.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  {isDayComplete(currentFlatDay) || client.completed_days?.includes(currentFlatDay.globalIndex) ? (
                    <div style={cs.dayDoneCard}>
                      <span style={{ fontSize: 24 }}>🎉</span>
                      <span style={{ color: "#4ade80", fontWeight: 800, fontSize: 16 }}>{t("dayComplete", lang)}</span>
                      {!isLastDay && (
                        <button style={cs.nextDayBtn} onClick={() => goNextDay(currentIdx)}>{t("nextDay", lang)}</button>
                      )}
                    </div>
                  ) : (
                    <button style={cs.completeDayBtn} onClick={() => markDayDone(currentFlatDay.globalIndex)}>{t("markDone", lang)}</button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === "log" && (
        <div style={cs.content}>
          <h2 style={cs.sectionTitle}>{t("myLogs", lang)}</h2>
          {logs.length === 0 ? <div style={cs.empty}>{t("noLogs", lang)}</div> : (
            logs.map((log, i) => {
              const ex = exercises.find(e => e.id === log.exercise_id);
              return (
                <div key={i} style={cs.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={cs.exName}>{ex?.name || "Exercise"}</div>
                    <div style={{ color: "#a0a0a0", fontSize: 12 }}>{log.log_date}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    {log.sets?.map((set, si) => (
                      <div key={si} style={cs.setBadge}>{t("set", lang)} {si + 1}: {set.reps} {t("reps", lang)}</div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

const cs = {
  root: { minHeight: "100vh", background: "#2a2e3c", fontFamily: "'Helvetica Neue', Arial, sans-serif", color: "#fff", paddingBottom: 80 },
  loginWrap: { maxWidth: 400, margin: "0 auto", padding: "50px 20px" },
  logo: { textAlign: "center", marginBottom: 28 },
  logoAr: { display: "block", fontSize: 44, fontWeight: 900, color: "#1fe5ff", letterSpacing: 2, lineHeight: 1 },
  logoEn: { display: "block", fontSize: 11, letterSpacing: 6, color: "#a0a0a0", marginTop: 4 },
  logo2: { fontSize: 20, fontWeight: 900, color: "#1fe5ff" },
  form: { display: "flex", flexDirection: "column", gap: 10 },
  input: { background: "#232736", border: "1px solid #3d4560", borderRadius: 8, color: "#fff", padding: "12px 14px", fontSize: 15, width: "100%", boxSizing: "border-box", marginBottom: 4, outline: "none" },
  btn: { background: "#1fe5ff", color: "#2a2e3c", border: "none", borderRadius: 10, padding: "14px 20px", fontWeight: 800, cursor: "pointer", fontSize: 16, width: "100%", marginTop: 8 },
  loginLabel: { color: "#e0e0e0", fontSize: 13, margin: "4px 0 4px" },
  error: { color: "#ef4444", fontSize: 13, margin: 0 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid #333a4d", background: "#232736" },
  logoutBtn: { background: "#333a4d", color: "#e0e0e0", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12 },
  tabRow: { display: "flex", borderBottom: "1px solid #333a4d", background: "#232736" },
  tabActive: { flex: 1, background: "#1fe5ff", color: "#2a2e3c", border: "none", padding: "12px", fontWeight: 700, cursor: "pointer", fontSize: 14 },
  tabInactive: { flex: 1, background: "transparent", color: "#a0a0a0", border: "none", padding: "12px", fontWeight: 600, cursor: "pointer", fontSize: 14 },
  content: { maxWidth: 600, margin: "0 auto", padding: "16px 14px" },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: 800, marginBottom: 14, marginTop: 0 },
  empty: { color: "#a0a0a0", textAlign: "center", padding: "50px 20px", fontSize: 15, lineHeight: 2 },
  notification: { position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#1fe5ff", color: "#2a2e3c", borderRadius: 8, padding: "10px 24px", fontWeight: 800, fontSize: 14, zIndex: 999, whiteSpace: "nowrap" },
  langBtn: { background: "#333a4d", color: "#a0a0a0", border: "1px solid #3d4560", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 },
  langActive: { background: "#1fe5ff", color: "#2a2e3c", border: "1px solid #1fe5ff", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 800 },
  progressCard: { background: "#232736", border: "1px solid #3d4560", borderRadius: 12, padding: 14, marginBottom: 16 },
  progressRing: { width: 48, height: 48, borderRadius: "50%", border: "3px solid #1fe5ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  progressTrack: { background: "#333a4d", borderRadius: 99, height: 6, overflow: "hidden" },
  progressFill: { background: "#1fe5ff", height: "100%", borderRadius: 99, transition: "width 0.4s ease" },
  dayHeader: { fontSize: 12, fontWeight: 800, color: "#1fe5ff", textTransform: "uppercase", letterSpacing: 2, padding: "6px 0 10px", borderBottom: "2px solid #1fe5ff", marginBottom: 12 },
  card: { background: "#232736", border: "1px solid #363d52", borderRadius: 12, padding: 14, marginBottom: 10 },
  exCard: { display: "flex", gap: 10, background: "#232736", border: "1px solid #363d52", borderRadius: 12, padding: 12, marginBottom: 10, alignItems: "flex-start" },
  exIndex: { width: 24, height: 24, minWidth: 24, background: "#1fe5ff", color: "#2a2e3c", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11, marginTop: 2 },
  exCardInner: { display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" },
  videoCol: { flexShrink: 0 },
  thumbWrap: { position: "relative", display: "block", width: 140, height: 79, borderRadius: 8, overflow: "hidden", textDecoration: "none" },
  thumbImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  playOverlay: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" },
  playBtn: { width: 32, height: 32, background: "#1fe5ff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#2a2e3c", fontWeight: 900, fontSize: 12, paddingLeft: 2 },
  videoFallback: { width: 140, height: 79, background: "#333a4d", border: "1px solid #3d4560", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textDecoration: "none", color: "#1fe5ff" },
  noVideo: { width: 140, height: 79, background: "#2a2e3c", border: "1px dashed #3d4560", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" },
  infoCol: { flex: 1, minWidth: 120 },
  exName: { color: "#fff", fontWeight: 700, fontSize: 14 },
  exCat: { color: "#1fe5ff", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 },
  statBox: { background: "#333a4d", border: "1px solid #3d4560", borderRadius: 8, padding: "5px 8px", textAlign: "center", minWidth: 44 },
  statValue: { color: "#1fe5ff", fontWeight: 900, fontSize: 15, lineHeight: 1 },
  statLabel: { color: "#c0c0c0", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 },
  lastLog: { background: "#333a4d", color: "#1fe5ff", borderRadius: 4, fontSize: 10, padding: "2px 7px", display: "inline-block", marginTop: 6 },
  coachNote: { background: "#1a2535", border: "1px solid #1fe5ff44", borderRadius: 8, padding: "7px 10px", marginTop: 8, display: "flex", flexDirection: "column", gap: 3 },
  coachNoteLabel: { color: "#1fe5ff", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 },
  setRow: { display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid #333a4d" },
  setLabel: { color: "#a0a0a0", fontSize: 12, fontWeight: 700, width: 44, flexShrink: 0 },
  setTarget: { color: "#fff", fontSize: 12, width: 56, flexShrink: 0 },
  setLast: { color: "#a0a0a0", fontSize: 11, flex: 1 },
  setInputWrap: { display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" },
  setInput: { background: "#333a4d", border: "1px solid #3d4560", borderRadius: 6, color: "#fff", padding: "6px 8px", fontSize: 15, fontWeight: 700, width: 56, textAlign: "center", outline: "none" },
  setUnit: { color: "#a0a0a0", fontSize: 10 },
  setDone: { color: "#4ade80", fontSize: 14, fontWeight: 900, width: 16 },
  doneBtn: { background: "#1fe5ff", color: "#2a2e3c", border: "none", borderRadius: 6, padding: "5px 10px", fontWeight: 800, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" },
  timerBar: { background: "#333a4d", borderRadius: 8, padding: "10px 12px", margin: "4px 0 6px", border: "1px solid #1fe5ff44" },
  timerTrack: { background: "#2a2e3c", borderRadius: 99, height: 6, overflow: "hidden" },
  timerFill: { background: "#1fe5ff", height: "100%", borderRadius: 99, transition: "width 1s linear" },
  skipBtn: { background: "transparent", color: "#a0a0a0", border: "1px solid #3d4560", borderRadius: 5, padding: "3px 8px", fontSize: 11, cursor: "pointer" },
  dayDoneCard: { background: "#1a3020", border: "1px solid #4ade80", borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  nextDayBtn: { background: "#4ade80", color: "#111", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 800, cursor: "pointer", fontSize: 13, marginLeft: "auto" },
  completeDayBtn: { background: "#1fe5ff", color: "#2a2e3c", border: "none", borderRadius: 10, padding: "14px 20px", fontWeight: 800, cursor: "pointer", fontSize: 15, width: "100%" },
  setBadge: { background: "#333a4d", color: "#fff", borderRadius: 4, fontSize: 11, padding: "3px 8px", display: "inline-block" },
};
