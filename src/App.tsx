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
  done: { en: "Done ✓", ar: "خلصت ✓" },
  skip: { en: "Skip", ar: "تخطى" },
  restTimer: { en: "Rest Timer", ar: "وقت الراحة" },
  restDone: { en: "Rest done! Next set 💪", ar: "انتهت الراحة! السيت القادم 💪" },
  markDone: { en: "✓ Mark Day Complete", ar: "✓ أنهيت اليوم" },
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
  const [completedSets, setCompletedSets] = useState({});
  const [restTimer, setRestTimer] = useState(null);
  const [notification, setNotification] = useState("");
  const [logs, setLogs] = useState([]);
  const [activeSetKey, setActiveSetKey] = useState(null);

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

  const startRestTimer = (key, seconds, nextKey) => {
    if (restTimer?.intervalId) clearInterval(restTimer.intervalId);
    let remaining = seconds;
    const intervalId = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(intervalId);
        setRestTimer(null);
        setCompletedSets(prev => ({ ...prev, [key]: true }));
        if (nextKey) setActiveSetKey(nextKey);
        notify(t("restDone", lang));
      } else {
        setRestTimer(prev => prev ? { ...prev, remaining } : null);
      }
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
    setLiveReps({}); setCompletedSets({}); setActiveSetKey(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // LOGIN
  if (!client) {
    return (
      <div style={{ ...cs.root, direction: isRTL ? "rtl" : "ltr" }}>
        <div style={cs.loginWrap}>
          <div style={cs.logo}>
            <span style={cs.logoAr}>تحرك</span>
            <span style={cs.logoEn}>TAHARRAK</span>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
            <button style={lang === "ar" ? cs.langActive : cs.langBtn} onClick={() => setLang("ar")}>العربية</button>
            <button style={lang === "en" ? cs.langActive : cs.langBtn} onClick={() => setLang("en")}>English</button>
          </div>
          <div style={cs.form}>
            <p style={cs.loginLabel}>{t("username", lang)}</p>
            <input style={cs.input} placeholder={t("username", lang)} value={username} onChange={e => setUsername(e.target.value)} autoCapitalize="none" autoCorrect="off" />
            <p style={cs.loginLabel}>{t("password", lang)}</p>
            <input style={cs.input} type="password" placeholder={t("password", lang)} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === "Enter") login(); }} />
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

      {/* Video Popup */}
      {videoPopup && (
        <div style={cs.popupBg} onClick={() => setVideoPopup(null)}>
          <div style={cs.popupBox} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ color: "#1fe5ff", fontWeight: 700, fontSize: 14 }}>{videoPopup.name}</span>
              <button style={cs.popupClose} onClick={() => setVideoPopup(null)}>✕ Close</button>
            </div>
            <div style={cs.popupPlayer}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoPopup.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none", borderRadius: 8 }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                title={videoPopup.name}
              />
            </div>
            <a 
              href={`https://www.youtube.com/watch?v=${videoPopup.id}`}
              target="_blank" 
              rel="noreferrer"
              style={{ display: "block", textAlign: "center", color: "#a0a0a0", fontSize: 12, marginTop: 10, textDecoration: "none" }}
            >
              {lang === "ar" ? "فتح في يوتيوب ↗" : "Open in YouTube ↗"}
            </a>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={cs.header}>
        <div>
          <div style={cs.logo2}>تحرك</div>
          <div style={{ color: "#e0e0e0", fontSize: 11 }}>{client.name}</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button style={lang === "ar" ? cs.langActive : cs.langBtn} onClick={() => setLang("ar")}>ع</button>
          <button style={lang === "en" ? cs.langActive : cs.langBtn} onClick={() => setLang("en")}>EN</button>
          <button style={cs.logoutBtn} onClick={() => {
            setClient(null); setUsername(""); setPassword(""); setLiveReps({});
            setCompletedSets({}); setActiveSetKey(null);
            if (restTimer?.intervalId) clearInterval(restTimer.intervalId); setRestTimer(null);
          }}>{t("logout", lang)}</button>
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
              <div style={{ fontSize: 52, marginBottom: 12 }}>🏆</div>
              <div style={{ color: "#1fe5ff", fontWeight: 800, fontSize: 22 }}>{t("programComplete", lang)}</div>
              <div style={{ marginTop: 8, color: "#e0e0e0" }}>{totalDays} {t("daysCompleted", lang)}</div>
            </div>
          ) : (
            <>
              {/* Progress Card */}
              <div style={cs.progressCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#1fe5ff", fontWeight: 800, fontSize: 14 }}>{program.name}</div>
                    <div style={{ color: "#e0e0e0", fontSize: 11, marginTop: 2 }}>
                      {t("week", lang)} {(currentFlatDay?.weekIndex || 0) + 1} · {currentFlatDay?.day.label} · {t("day", lang)} {currentIdx + 1} {t("of", lang)} {totalDays}
                    </div>
                  </div>
                  <div style={cs.progressRing}>
                    <span style={{ color: "#1fe5ff", fontWeight: 900, fontSize: 12 }}>{Math.round((currentIdx / totalDays) * 100)}%</span>
                  </div>
                </div>
                <div style={cs.progressTrack}><div style={{ ...cs.progressFill, width: `${(currentIdx / totalDays) * 100}%` }} /></div>
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
                    {/* Exercise name + number */}
                    <div style={cs.exHeader}>
                      <div style={cs.exIndex}>{ei + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={cs.exName}>{ex.name}</div>
                        <div style={cs.exCat}>{ex.category}</div>
                      </div>
                    </div>

                    {/* Video full width on mobile */}
                    {thumbUrl ? (
                      <a href={ex.video_url} target="_blank" rel="noreferrer" style={cs.thumbWrapFull}>
                        <img src={thumbUrl} alt={ex.name} style={cs.thumbImgFull} />
                        <div style={cs.playOverlay}>
                          <div style={cs.playBtn}>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <polygon points="3,1 13,7 3,13" fill="#2a2e3c"/>
                            </svg>
                          </div>
                        </div>
                      </a>
                    ) : ex.video_url ? (
                      <a href={ex.video_url} target="_blank" rel="noreferrer" style={cs.videoFallbackFull}>
                        <div style={cs.playBtn}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <polygon points="3,1 13,7 3,13" fill="#2a2e3c"/>
                          </svg>
                        </div>
                        <span style={{ fontSize: 10, color: "#e0e0e0", marginTop: 4 }}>{t("watchVideo", lang)}</span>
                      </a>
                    ) : null}

                    {/* Stat boxes */}
                    <div style={{ display: "flex", gap: 8, marginTop: 10, marginBottom: 6 }}>
                      {exItem.sets && <div style={cs.statBox}><div style={cs.statValue}>{exItem.sets}</div><div style={cs.statLabel}>{t("sets", lang)}</div></div>}
                      {exItem.reps && <div style={cs.statBox}><div style={cs.statValue}>{exItem.reps}</div><div style={cs.statLabel}>{t("reps", lang)}</div></div>}
                      {exItem.rest && <div style={cs.statBox}><div style={cs.statValue}>{exItem.rest}s</div><div style={cs.statLabel}>{t("rest", lang)}</div></div>}
                    </div>

                    {/* Description + coach note */}
                    {ex.description && <div style={{ color: "#c0c0c0", fontSize: 12, marginBottom: 6 }}>{ex.description}</div>}
                    {exItem.note && (
                      <div style={cs.coachNote}>
                        <span style={cs.coachNoteLabel}>📋 {t("coachNote", lang)}</span>
                        <span style={{ color: "#fff", fontSize: 13 }}>{exItem.note}</span>
                      </div>
                    )}
                    {exLogs.length > 0 && (
                      <div style={cs.lastLog}>{t("lastSession", lang)}: {exLogs[0].sets?.map(s => `${s.reps} reps`).join(" | ")}</div>
                    )}

                    {/* Sets */}
                    {exItem.sets && (
                      <div style={{ marginTop: 10, borderTop: "1px solid #333a4d", paddingTop: 8 }}>
                        {Array.from({ length: parseInt(exItem.sets) || 1 }).map((_, si) => {
                          const key = `${exItem.id}-${gi}-${si}`;
                          const lastLog = exLogs.length > 0 ? exLogs[0].sets?.[si] : null;
                          const val = liveReps[key] !== undefined ? liveReps[key] : "";
                          const saved = val !== "" && !isNaN(parseInt(val));
                          const isTimerActive = restTimer?.key === key;
                          const isCompleted = completedSets[key];
                          const isActive = activeSetKey === key || (!activeSetKey && si === 0 && !completedSets[key]);

                          return (
                            <div key={si}>
                              <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: isActive ? "10px 12px" : "8px 4px",
                                marginBottom: 4,
                                background: isActive ? "#1a2535" : isCompleted ? "#0f1f10" : "transparent",
                                borderRadius: 10,
                                borderLeft: isActive ? "4px solid #1fe5ff" : isCompleted ? "4px solid #4ade80" : "4px solid transparent",
                                transition: "all 0.2s ease",
                              }}>
                                {/* Set label */}
                                <div style={{ fontSize: 13, fontWeight: 800, width: 52, flexShrink: 0, color: isCompleted ? "#4ade80" : isActive ? "#1fe5ff" : "#a0a0a0" }}>
                                  {isCompleted ? "✓ " + (si + 1) : `${t("set", lang)} ${si + 1}`}
                                </div>

                                {/* Target reps */}
                                {exItem.reps && <div style={{ color: "#fff", fontSize: 12, width: 36, flexShrink: 0 }}>{exItem.reps}</div>}

                                {/* Last log */}
                                {lastLog && <div style={{ color: "#a0a0a0", fontSize: 10, flex: 1 }}>{t("lastSession", lang)}: {lastLog.reps}</div>}

                                {/* Input */}
                                <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                                  <input
                                    style={{
                                      background: "#232736",
                                      border: `2px solid ${isCompleted ? "#4ade80" : saved ? "#1fe5ff" : "#3d4560"}`,
                                      borderRadius: 8,
                                      color: "#fff",
                                      fontWeight: 800,
                                      textAlign: "center",
                                      outline: "none",
                                      fontSize: 18,
                                      width: 62,
                                      padding: "8px 4px",
                                    }}
                                    type="number" min="0" placeholder="—" value={val}
                                    onFocus={() => setActiveSetKey(key)}
                                    onChange={e => {
                                      const newVal = e.target.value;
                                      const newReps = { ...liveReps, [key]: newVal };
                                      setLiveReps(newReps);
                                      saveRep(exItem, gi, si, newVal, newReps);
                                    }}
                                  />
                                  <span style={{ color: "#a0a0a0", fontSize: 10 }}>{t("reps", lang)}</span>
                                </div>

                                {/* Done button — disappears when timer finishes */}
                                {saved && !isTimerActive && !isCompleted && (
                                  <button style={cs.doneBtn} onClick={() => {
                                    const nextKey = `${exItem.id}-${gi}-${si + 1}`;
                                    startRestTimer(key, parseInt(exItem.rest) || 60, nextKey);
                                  }}>{t("done", lang)}</button>
                                )}
                              </div>

                              {/* Rest Timer */}
                              {isTimerActive && (
                                <div style={cs.timerBar}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                    <span style={{ color: "#1fe5ff", fontWeight: 700, fontSize: 13 }}>⏱ {t("restTimer", lang)}</span>
                                    <span style={{ color: "#fff", fontWeight: 900, fontSize: 26 }}>{Math.floor(restTimer.remaining / 60)}:{String(restTimer.remaining % 60).padStart(2, "0")}</span>
                                    <button style={cs.skipBtn} onClick={() => {
                                      clearInterval(restTimer.intervalId);
                                      setRestTimer(null);
                                      setCompletedSets(prev => ({ ...prev, [key]: true }));
                                      const nextKey = `${exItem.id}-${gi}-${si + 1}`;
                                      setActiveSetKey(nextKey);
                                    }}>{t("skip", lang)}</button>
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
                );
              })}

              {/* Complete Day */}
              {currentFlatDay?.day.exercises?.length > 0 && (
                <div style={{ marginTop: 16, paddingBottom: 20 }}>
                  {isDayComplete(currentFlatDay) || client.completed_days?.includes(currentFlatDay.globalIndex) ? (
                    <div style={cs.dayDoneCard}>
                      <span style={{ fontSize: 28 }}>🎉</span>
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
  root: { minHeight: "100vh", background: "#2a2e3c", fontFamily: "'Helvetica Neue', Arial, sans-serif", color: "#fff", paddingBottom: 100 },
  loginWrap: { maxWidth: 400, margin: "0 auto", padding: "40px 20px" },
  logo: { textAlign: "center", marginBottom: 28 },
  logoAr: { display: "block", fontSize: 52, fontWeight: 900, color: "#1fe5ff", letterSpacing: 2, lineHeight: 1 },
  logoEn: { display: "block", fontSize: 11, letterSpacing: 6, color: "#a0a0a0", marginTop: 4 },
  logo2: { fontSize: 20, fontWeight: 900, color: "#1fe5ff" },
  form: { display: "flex", flexDirection: "column", gap: 6 },
  input: { background: "#232736", border: "1px solid #3d4560", borderRadius: 12, color: "#fff", padding: "16px", fontSize: 16, width: "100%", boxSizing: "border-box", marginBottom: 4, outline: "none" },
  btn: { background: "#1fe5ff", color: "#2a2e3c", border: "none", borderRadius: 14, padding: "18px 20px", fontWeight: 900, cursor: "pointer", fontSize: 18, width: "100%", marginTop: 12 },
  loginLabel: { color: "#e0e0e0", fontSize: 14, margin: "8px 0 4px" },
  error: { color: "#ef4444", fontSize: 13, margin: 0 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid #333a4d", background: "#232736", position: "sticky", top: 0, zIndex: 50 },
  logoutBtn: { background: "#333a4d", color: "#e0e0e0", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12 },
  tabRow: { display: "flex", borderBottom: "1px solid #333a4d", background: "#232736", position: "sticky", top: 50, zIndex: 49 },
  tabActive: { flex: 1, background: "#1fe5ff", color: "#2a2e3c", border: "none", padding: "14px", fontWeight: 800, cursor: "pointer", fontSize: 15 },
  tabInactive: { flex: 1, background: "transparent", color: "#a0a0a0", border: "none", padding: "14px", fontWeight: 600, cursor: "pointer", fontSize: 15 },
  content: { maxWidth: 560, margin: "0 auto", padding: "12px 12px" },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: 800, marginBottom: 14, marginTop: 0 },
  empty: { color: "#a0a0a0", textAlign: "center", padding: "50px 20px", fontSize: 15, lineHeight: 2 },
  notification: { position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", background: "#1fe5ff", color: "#2a2e3c", borderRadius: 10, padding: "10px 20px", fontWeight: 800, fontSize: 14, zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" },
  langBtn: { background: "#333a4d", color: "#a0a0a0", border: "1px solid #3d4560", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 },
  langActive: { background: "#1fe5ff", color: "#2a2e3c", border: "1px solid #1fe5ff", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 800 },
  progressCard: { background: "#232736", border: "1px solid #3d4560", borderRadius: 14, padding: 12, marginBottom: 12 },
  progressRing: { width: 44, height: 44, borderRadius: "50%", border: "3px solid #1fe5ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  progressTrack: { background: "#333a4d", borderRadius: 99, height: 7, overflow: "hidden" },
  progressFill: { background: "#1fe5ff", height: "100%", borderRadius: 99, transition: "width 0.4s ease" },
  dayHeader: { fontSize: 11, fontWeight: 800, color: "#1fe5ff", textTransform: "uppercase", letterSpacing: 2, padding: "6px 0 10px", borderBottom: "2px solid #1fe5ff", marginBottom: 12 },
  card: { background: "#232736", border: "1px solid #363d52", borderRadius: 12, padding: 14, marginBottom: 10 },
  exCard: { background: "#232736", border: "1px solid #363d52", borderRadius: 16, padding: 14, marginBottom: 14 },
  exHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  exIndex: { width: 30, height: 30, minWidth: 30, background: "#1fe5ff", color: "#2a2e3c", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13 },
  exName: { color: "#fff", fontWeight: 800, fontSize: 15 },
  exCat: { color: "#1fe5ff", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginTop: 1 },
  thumbWrapFull: { position: "relative", display: "block", width: "100%", height: 180, borderRadius: 10, overflow: "hidden", textDecoration: "none", marginBottom: 10 },
  thumbImgFull: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  videoFallbackFull: { width: "100%", height: 100, background: "#333a4d", border: "1px solid #3d4560", borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textDecoration: "none", color: "#1fe5ff", marginBottom: 10 },
  playOverlay: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" },
  playBtn: { width: 44, height: 44, background: "#1fe5ff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#2a2e3c", fontWeight: 900, fontSize: 16, paddingLeft: 3 },
  statBox: { background: "#333a4d", border: "1px solid #3d4560", borderRadius: 10, padding: "8px 12px", textAlign: "center", flex: 1 },
  statValue: { color: "#1fe5ff", fontWeight: 900, fontSize: 18, lineHeight: 1 },
  statLabel: { color: "#c0c0c0", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 3 },
  lastLog: { background: "#333a4d", color: "#1fe5ff", borderRadius: 6, fontSize: 11, padding: "4px 10px", display: "inline-block", marginTop: 6, marginBottom: 4 },
  coachNote: { background: "#1a2535", border: "1px solid #1fe5ff33", borderRadius: 10, padding: "10px 12px", marginTop: 6, marginBottom: 6, display: "flex", flexDirection: "column", gap: 4 },
  coachNoteLabel: { color: "#1fe5ff", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 },
  doneBtn: { background: "#1fe5ff", color: "#2a2e3c", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 800, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 },
  timerBar: { background: "#1a2535", borderRadius: 12, padding: "14px 16px", margin: "6px 0 8px", border: "1px solid #1fe5ff33" },
  timerTrack: { background: "#2a2e3c", borderRadius: 99, height: 8, overflow: "hidden" },
  timerFill: { background: "#1fe5ff", height: "100%", borderRadius: 99, transition: "width 1s linear" },
  skipBtn: { background: "transparent", color: "#a0a0a0", border: "1px solid #3d4560", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" },
  dayDoneCard: { background: "#1a3020", border: "1px solid #4ade80", borderRadius: 14, padding: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  nextDayBtn: { background: "#4ade80", color: "#111", border: "none", borderRadius: 10, padding: "12px 20px", fontWeight: 800, cursor: "pointer", fontSize: 15, marginLeft: "auto" },
  completeDayBtn: { background: "#1fe5ff", color: "#2a2e3c", border: "none", borderRadius: 14, padding: "18px 20px", fontWeight: 900, cursor: "pointer", fontSize: 17, width: "100%" },
  popupBg: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  popupBox: { background: "#232736", borderRadius: 14, padding: 16, width: "100%", maxWidth: 560, border: "1px solid #3d4560" },
  popupClose: { background: "#363d52", color: "#fff", border: "none", borderRadius: 6, width: 32, height: 32, cursor: "pointer", fontSize: 16, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" },
  popupPlayer: { position: "relative", width: "100%", paddingTop: "56.25%", borderRadius: 8, overflow: "hidden" },
  setBadge: { background: "#333a4d", color: "#fff", borderRadius: 6, fontSize: 11, padding: "4px 10px", display: "inline-block" },
};
