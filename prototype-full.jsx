import { useState, useRef, useEffect, useCallback } from "react";

const connections = [
  {
    id: 1, name: "postgres_1", type: "POSTGRESQL", status: "Успешно",
    details: { host: "172.24.110.112", user: "admin", role: "SOURCE", dbType: "POSTGRESQL", database: "analytics", port: "5432", class: "BATCH" },
  },
  {
    id: 2, name: "clickhouse_1", type: "CLICKHOUSE", status: "Успешно",
    details: { host: "172.24.110.114", user: "username", role: "SOURCE", dbType: "CLICKHOUSE", database: "etl", port: "9000", class: "BATCH" },
  },
  {
    id: 3, name: "kafka_stream", type: "KAFKA", status: "Ошибка",
    details: { host: "172.24.110.120", user: "kafka_user", role: "SOURCE", dbType: "KAFKA", database: "events", port: "9092", class: "STREAM" },
  },
];

const StatusDot = ({ status }) => (
  <span style={{ width: 8, height: 8, borderRadius: "50%", background: status === "Успешно" ? "#34C759" : "#FF3B30", display: "inline-block", marginRight: 6 }} />
);

const DetailGrid = ({ details }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px", paddingTop: 14 }}>
    {[["Хост", details.host], ["Пользователь", details.user], ["Роль", details.role], ["База данных", details.database], ["Порт", details.port], ["Класс", details.class]].map(([label, val]) => (
      <div key={label}>
        <div style={{ fontSize: 11, color: "#8E8E93", fontFamily: "'DM Sans', sans-serif", marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, color: "#1a1a2e", fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>{val}</div>
      </div>
    ))}
  </div>
);

const ChevronIcon = ({ expanded, color = "#C7C7CC" }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"
    style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s ease" }}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const EditIcon = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TrashIcon = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>;

const SwipeActionBtns = ({ onEdit, onDelete, style = {} }) => (
  <div style={{ display: "flex", ...style }}>
    <button onClick={onEdit} style={{ flex: 1, border: "none", background: "#007AFF", color: "#fff", fontSize: 13, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, flexDirection: "column" }}>
      <EditIcon /> Изменить
    </button>
    <button onClick={onDelete} style={{ flex: 1, border: "none", background: "#FF3B30", color: "#fff", fontSize: 13, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, flexDirection: "column", borderRadius: "0 16px 16px 0" }}>
      <TrashIcon /> Удалить
    </button>
  </div>
);

/* ─── useSwipe hook ─── */
function useSwipe(actionWidth = 140, enabled = true) {
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const currentOffset = useRef(0);

  const onTouchStart = (e) => { if (!enabled) return; startX.current = e.touches[0].clientX; setSwiping(true); };
  const onTouchMove = (e) => {
    if (!enabled || !swiping) return;
    const diff = e.touches[0].clientX - startX.current;
    setOffsetX(Math.max(-actionWidth, Math.min(0, diff + currentOffset.current)));
  };
  const onTouchEnd = () => {
    if (!enabled) return;
    setSwiping(false);
    if (offsetX < -actionWidth / 2) { setOffsetX(-actionWidth); currentOffset.current = -actionWidth; }
    else { setOffsetX(0); currentOffset.current = 0; }
  };
  const reset = () => { setOffsetX(0); currentOffset.current = 0; };

  return { offsetX, swiping, onTouchStart, onTouchMove, onTouchEnd, reset };
}

/* ═══════════════════════════════════════════
   1. Свайп + аккордеон (блок при развёрнутом)
   ═══════════════════════════════════════════ */
const Variant1 = ({ conn, onDelete, onEdit }) => {
  const [expanded, setExpanded] = useState(false);
  const sw = useSwipe(140, !expanded);

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 16, marginBottom: 12 }}>
      <SwipeActionBtns onEdit={() => { onEdit(conn); sw.reset(); }} onDelete={() => { onDelete(conn); sw.reset(); }}
        style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 140, zIndex: 0 }} />
      <div onTouchStart={sw.onTouchStart} onTouchMove={sw.onTouchMove} onTouchEnd={sw.onTouchEnd}
        style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: 16, border: "1px solid #E8E8ED", transform: `translateX(${sw.offsetX}px)`, transition: sw.swiping ? "none" : "transform 0.3s ease", cursor: "pointer" }}>
        <div onClick={() => { if (sw.offsetX < -10) sw.reset(); else setExpanded(!expanded); }} style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e", fontFamily: "'DM Sans', sans-serif" }}>{conn.name}</div>
              <div style={{ fontSize: 12, color: "#8E8E93", fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>{conn.type}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StatusDot status={conn.status} /><span style={{ fontSize: 12, color: "#8E8E93" }}>{conn.status}</span>
              <ChevronIcon expanded={expanded} />
            </div>
          </div>
        </div>
        <div style={{ maxHeight: expanded ? 300 : 0, overflow: "hidden", transition: "max-height 0.35s ease" }}>
          <div style={{ padding: "0 20px 16px", borderTop: "1px solid #F2F2F7" }}><DetailGrid details={conn.details} /></div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   2. Свайп + Bottom Sheet
   ═══════════════════════════════════════════ */
const BottomSheet = ({ conn, onClose }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  const close = () => { setVisible(false); setTimeout(onClose, 300); };

  return (
    <div onClick={close} style={{ position: "fixed", inset: 0, background: visible ? "rgba(0,0,0,0.4)" : "transparent", transition: "background 0.3s", zIndex: 100, display: "flex", alignItems: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: "#fff", borderRadius: "24px 24px 0 0", padding: "12px 24px 32px", transform: visible ? "translateY(0)" : "translateY(100%)", transition: "transform 0.35s ease" }}>
        <div style={{ width: 40, height: 4, background: "#D1D1D6", borderRadius: 2, margin: "0 auto 20px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e", fontFamily: "'DM Sans', sans-serif" }}>{conn.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}><StatusDot status={conn.status} /><span style={{ fontSize: 13, color: "#8E8E93" }}>{conn.status}</span></div>
          </div>
          <span style={{ fontSize: 12, color: "#fff", background: "#8E8E93", borderRadius: 8, padding: "4px 10px" }}>{conn.type}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
          {[["Хост", conn.details.host], ["Пользователь", conn.details.user], ["Роль", conn.details.role], ["База данных", conn.details.database], ["Порт", conn.details.port], ["Класс", conn.details.class]].map(([l, v]) => (
            <div key={l} style={{ background: "#F9F9FB", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "#8E8E93", marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: 15, color: "#1a1a2e", fontWeight: 600 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button style={{ flex: 1, padding: 14, border: "none", borderRadius: 14, background: "#007AFF", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Изменить</button>
          <button style={{ flex: 1, padding: 14, border: "2px solid #FF3B30", borderRadius: 14, background: "transparent", color: "#FF3B30", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Удалить</button>
        </div>
      </div>
    </div>
  );
};

const Variant2 = ({ conn, onDelete, onEdit, onOpenSheet }) => {
  const sw = useSwipe(140);
  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 16, marginBottom: 12 }}>
      <SwipeActionBtns onEdit={() => { onEdit(conn); sw.reset(); }} onDelete={() => { onDelete(conn); sw.reset(); }}
        style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 140, zIndex: 0 }} />
      <div onTouchStart={sw.onTouchStart} onTouchMove={sw.onTouchMove} onTouchEnd={sw.onTouchEnd}
        onClick={() => { if (sw.offsetX < -10) sw.reset(); else onOpenSheet(conn); }}
        style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: 16, border: "1px solid #E8E8ED", padding: "16px 20px", transform: `translateX(${sw.offsetX}px)`, transition: sw.swiping ? "none" : "transform 0.3s ease", cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e", fontFamily: "'DM Sans', sans-serif" }}>{conn.name}</div>
            <div style={{ fontSize: 12, color: "#8E8E93", marginTop: 2 }}>{conn.type}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <StatusDot status={conn.status} /><span style={{ fontSize: 12, color: "#8E8E93" }}>{conn.status}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   3. Long Press контекстное меню
   ═══════════════════════════════════════════ */
const Variant3 = ({ conn, onDelete, onEdit }) => {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const pressTimer = useRef(null);
  const cardRef = useRef(null);

  const start = (e) => { const t = e.touches[0]; pressTimer.current = setTimeout(() => { const r = cardRef.current.getBoundingClientRect(); setMenuPos({ x: t.clientX - r.left, y: t.clientY - r.top }); setMenuOpen(true); }, 500); };
  const end = () => clearTimeout(pressTimer.current);

  return (
    <>
      {menuOpen && <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />}
      <div ref={cardRef} style={{ position: "relative", marginBottom: 12 }}>
        <div onTouchStart={start} onTouchEnd={end} onTouchMove={end}
          style={{ background: "#fff", borderRadius: 16, border: "1px solid #E8E8ED", transform: menuOpen ? "scale(0.97)" : "scale(1)", transition: "transform 0.2s" }}>
          <div onClick={() => { if (!menuOpen) setExpanded(!expanded); }} style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e", fontFamily: "'DM Sans', sans-serif" }}>{conn.name}</div>
                <div style={{ fontSize: 12, color: "#8E8E93", marginTop: 2 }}>{conn.type}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <StatusDot status={conn.status} /><span style={{ fontSize: 12, color: "#8E8E93" }}>{conn.status}</span>
                <ChevronIcon expanded={expanded} />
              </div>
            </div>
          </div>
          <div style={{ maxHeight: expanded ? 300 : 0, overflow: "hidden", transition: "max-height 0.35s ease" }}>
            <div style={{ padding: "0 20px 16px", borderTop: "1px solid #F2F2F7" }}><DetailGrid details={conn.details} /></div>
          </div>
        </div>
        {menuOpen && (
          <div style={{ position: "absolute", top: menuPos.y, left: Math.min(menuPos.x, 200), zIndex: 100, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "0 8px 40px rgba(0,0,0,0.18)", overflow: "hidden", minWidth: 180, animation: "menuFadeIn 0.2s ease" }}>
            {[{ label: "Изменить", icon: "✏️", action: () => { onEdit(conn); setMenuOpen(false); } }, { label: "Дублировать", icon: "📋", action: () => setMenuOpen(false) }, { label: "Проверить", icon: "🔄", action: () => setMenuOpen(false) }, { label: "Удалить", icon: "🗑️", color: "#FF3B30", action: () => { onDelete(conn); setMenuOpen(false); } }].map((item, i) => (
              <button key={i} onClick={item.action} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", border: "none", borderBottom: i < 3 ? "1px solid #F2F2F7" : "none", background: "transparent", fontSize: 15, color: item.color || "#1a1a2e", fontFamily: "'DM Sans', sans-serif", cursor: "pointer", textAlign: "left" }}>
                <span>{item.icon}</span> {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

/* ═══════════════════════════════════════════
   A. Свайп вправо/влево — разные функции
   ═══════════════════════════════════════════ */
const VariantA = ({ conn, onDelete, onEdit }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentOffset = useRef(0);
  const isHorizontal = useRef(null);
  const ACTION_WIDTH = 140;
  const DETAIL_THRESHOLD = 80;

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontal.current = null;
    setSwiping(true);
  };
  const onTouchMove = (e) => {
    if (!swiping) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (isHorizontal.current === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) isHorizontal.current = Math.abs(dx) > Math.abs(dy);
      else return;
    }
    if (!isHorizontal.current) return;
    const newOffset = Math.max(-ACTION_WIDTH, Math.min(DETAIL_THRESHOLD + 20, dx + currentOffset.current));
    setOffsetX(newOffset);
  };
  const onTouchEnd = () => {
    setSwiping(false);
    if (offsetX > DETAIL_THRESHOLD / 2 && !expanded) {
      setExpanded(true); setOffsetX(0); currentOffset.current = 0;
    } else if (offsetX < -ACTION_WIDTH / 2) {
      setOffsetX(-ACTION_WIDTH); currentOffset.current = -ACTION_WIDTH;
    } else {
      setOffsetX(0); currentOffset.current = 0;
    }
  };
  const reset = () => { setOffsetX(0); currentOffset.current = 0; };

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 16, marginBottom: 12 }}>
      {/* Left: detail indicator */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 100, background: "linear-gradient(90deg, #007AFF, #5AC8FA)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 0, borderRadius: "16px 0 0 16px", flexDirection: "column", gap: 4 }}>
        <svg width="20" height="20" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        <span style={{ color: "#fff", fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Детали</span>
      </div>
      {/* Right: actions */}
      <SwipeActionBtns onEdit={() => { onEdit(conn); reset(); }} onDelete={() => { onDelete(conn); reset(); }}
        style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 140, zIndex: 0 }} />

      <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: 16, border: "1px solid #E8E8ED", transform: `translateX(${offsetX}px)`, transition: swiping ? "none" : "transform 0.3s ease" }}>
        <div onClick={() => { if (offsetX < -10) reset(); else setExpanded(!expanded); }} style={{ padding: "16px 20px", cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e", fontFamily: "'DM Sans', sans-serif" }}>{conn.name}</div>
              <div style={{ fontSize: 12, color: "#8E8E93", marginTop: 2 }}>{conn.type}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StatusDot status={conn.status} /><span style={{ fontSize: 12, color: "#8E8E93" }}>{conn.status}</span>
              <ChevronIcon expanded={expanded} />
            </div>
          </div>
        </div>
        <div style={{ maxHeight: expanded ? 300 : 0, overflow: "hidden", transition: "max-height 0.35s ease" }}>
          <div style={{ padding: "0 20px 16px", borderTop: "1px solid #F2F2F7" }}><DetailGrid details={conn.details} /></div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   B. Мини-превью + свайп всегда
   ═══════════════════════════════════════════ */
const VariantB = ({ conn, onDelete, onEdit }) => {
  const [expanded, setExpanded] = useState(false);
  const sw = useSwipe(140, true);

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 16, marginBottom: 12 }}>
      <SwipeActionBtns onEdit={() => { onEdit(conn); sw.reset(); }} onDelete={() => { onDelete(conn); sw.reset(); }}
        style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 140, zIndex: 0 }} />
      <div onTouchStart={sw.onTouchStart} onTouchMove={sw.onTouchMove} onTouchEnd={sw.onTouchEnd}
        style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: 16, border: "1px solid #E8E8ED", transform: `translateX(${sw.offsetX}px)`, transition: sw.swiping ? "none" : "transform 0.3s ease" }}>
        <div onClick={() => { if (sw.offsetX < -10) sw.reset(); else setExpanded(!expanded); }} style={{ padding: "16px 20px", cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e", fontFamily: "'DM Sans', sans-serif" }}>{conn.name}</div>
              <div style={{ fontSize: 12, color: "#8E8E93", marginTop: 2 }}>{conn.type}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StatusDot status={conn.status} /><span style={{ fontSize: 12, color: "#8E8E93" }}>{conn.status}</span>
              <ChevronIcon expanded={expanded} />
            </div>
          </div>
          {/* Mini preview always visible */}
          <div style={{ display: "flex", gap: 16, marginTop: 10, paddingTop: 10, borderTop: "1px solid #F2F2F7" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#8E8E93" }}>Хост:</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e", fontFamily: "'DM Sans', sans-serif" }}>{conn.details.host}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#8E8E93" }}>Порт:</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e", fontFamily: "'DM Sans', sans-serif" }}>{conn.details.port}</span>
            </div>
          </div>
        </div>
        <div style={{ maxHeight: expanded ? 300 : 0, overflow: "hidden", transition: "max-height 0.35s ease" }}>
          <div style={{ padding: "0 20px 16px", borderTop: "1px solid #F2F2F7" }}><DetailGrid details={conn.details} /></div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   C. Свайп с шагами (короткий/длинный)
   ═══════════════════════════════════════════ */
const VariantC = ({ conn, onDelete, onEdit }) => {
  const [expanded, setExpanded] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const startX = useRef(0);
  const currentOffset = useRef(0);
  const ACTION_WIDTH = 140;
  const DELETE_THRESHOLD = 250;

  const onTouchStart = (e) => { startX.current = e.touches[0].clientX; setSwiping(true); };
  const onTouchMove = (e) => {
    if (!swiping) return;
    const diff = e.touches[0].clientX - startX.current;
    const newOffset = Math.max(-DELETE_THRESHOLD - 30, Math.min(0, diff + currentOffset.current));
    setOffsetX(newOffset);
    setDeleting(newOffset < -DELETE_THRESHOLD);
  };
  const onTouchEnd = () => {
    setSwiping(false);
    if (deleting) { onDelete(conn); setOffsetX(0); currentOffset.current = 0; setDeleting(false); return; }
    if (offsetX < -ACTION_WIDTH / 2) { setOffsetX(-ACTION_WIDTH); currentOffset.current = -ACTION_WIDTH; }
    else { setOffsetX(0); currentOffset.current = 0; }
  };
  const reset = () => { setOffsetX(0); currentOffset.current = 0; };

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 16, marginBottom: 12 }}>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: DELETE_THRESHOLD + 30, display: "flex", zIndex: 0 }}>
        <button onClick={() => { onEdit(conn); reset(); }} style={{ width: 70, border: "none", background: "#007AFF", color: "#fff", fontSize: 13, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, flexDirection: "column" }}>
          <EditIcon /> Изменить
        </button>
        <div style={{
          flex: 1, border: "none",
          background: deleting ? "#CC0000" : "#FF3B30",
          color: "#fff", fontSize: deleting ? 15 : 13,
          fontFamily: "'DM Sans', sans-serif",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 4, flexDirection: "column",
          borderRadius: "0 16px 16px 0",
          transition: "background 0.2s, font-size 0.2s",
        }}>
          <TrashIcon />
          {deleting ? "Отпустите" : "Удалить"}
        </div>
      </div>

      <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: 16, border: "1px solid #E8E8ED", transform: `translateX(${offsetX}px)`, transition: swiping ? "none" : "transform 0.3s ease" }}>
        <div onClick={() => { if (offsetX < -10) reset(); else setExpanded(!expanded); }} style={{ padding: "16px 20px", cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e", fontFamily: "'DM Sans', sans-serif" }}>{conn.name}</div>
              <div style={{ fontSize: 12, color: "#8E8E93", marginTop: 2 }}>{conn.type}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StatusDot status={conn.status} /><span style={{ fontSize: 12, color: "#8E8E93" }}>{conn.status}</span>
              <ChevronIcon expanded={expanded} />
            </div>
          </div>
        </div>
        <div style={{ maxHeight: expanded ? 300 : 0, overflow: "hidden", transition: "max-height 0.35s ease" }}>
          <div style={{ padding: "0 20px 16px", borderTop: "1px solid #F2F2F7" }}><DetailGrid details={conn.details} /></div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   D. Floating Action Buttons при свайпе
   ═══════════════════════════════════════════ */
const VariantD = ({ conn, onDelete, onEdit }) => {
  const [expanded, setExpanded] = useState(false);
  const [showFabs, setShowFabs] = useState(false);
  const sw = useSwipe(80, true);

  useEffect(() => {
    if (sw.offsetX < -40) setShowFabs(true);
    else if (sw.offsetX === 0) {
      const t = setTimeout(() => setShowFabs(false), 300);
      return () => clearTimeout(t);
    }
  }, [sw.offsetX]);

  return (
    <div style={{ position: "relative", marginBottom: 12 }}>
      <div onTouchStart={sw.onTouchStart} onTouchMove={sw.onTouchMove} onTouchEnd={sw.onTouchEnd}
        style={{ background: "#fff", borderRadius: 16, border: "1px solid #E8E8ED", transform: `translateX(${sw.offsetX}px)`, transition: sw.swiping ? "none" : "transform 0.3s ease" }}>
        <div onClick={() => { if (sw.offsetX < -10) sw.reset(); else setExpanded(!expanded); }} style={{ padding: "16px 20px", cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e", fontFamily: "'DM Sans', sans-serif" }}>{conn.name}</div>
              <div style={{ fontSize: 12, color: "#8E8E93", marginTop: 2 }}>{conn.type}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StatusDot status={conn.status} /><span style={{ fontSize: 12, color: "#8E8E93" }}>{conn.status}</span>
              <ChevronIcon expanded={expanded} />
            </div>
          </div>
        </div>
        <div style={{ maxHeight: expanded ? 300 : 0, overflow: "hidden", transition: "max-height 0.35s ease" }}>
          <div style={{ padding: "0 20px 16px", borderTop: "1px solid #F2F2F7" }}><DetailGrid details={conn.details} /></div>
        </div>
      </div>

      {/* Floating buttons */}
      <div style={{
        position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
        display: "flex", flexDirection: "column", gap: 8, zIndex: 10,
        opacity: showFabs ? 1 : 0, pointerEvents: showFabs ? "auto" : "none",
        transition: "opacity 0.2s ease",
      }}>
        <button onClick={() => { onEdit(conn); sw.reset(); }}
          style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: "#007AFF", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(0,122,255,0.4)", animation: showFabs ? "fabIn 0.25s ease" : "none" }}>
          <EditIcon />
        </button>
        <button onClick={() => { onDelete(conn); sw.reset(); }}
          style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: "#FF3B30", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(255,59,48,0.4)", animation: showFabs ? "fabIn 0.25s ease 0.05s both" : "none" }}>
          <TrashIcon />
        </button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   E. Свайп + inline кнопки в развёрнутом
   ═══════════════════════════════════════════ */
const VariantE = ({ conn, onDelete, onEdit }) => {
  const [expanded, setExpanded] = useState(false);
  const sw = useSwipe(140, !expanded);

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 16, marginBottom: 12 }}>
      <SwipeActionBtns onEdit={() => { onEdit(conn); sw.reset(); }} onDelete={() => { onDelete(conn); sw.reset(); }}
        style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 140, zIndex: 0 }} />
      <div onTouchStart={sw.onTouchStart} onTouchMove={sw.onTouchMove} onTouchEnd={sw.onTouchEnd}
        style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: 16, border: "1px solid #E8E8ED", transform: `translateX(${sw.offsetX}px)`, transition: sw.swiping ? "none" : "transform 0.3s ease" }}>
        <div onClick={() => { if (sw.offsetX < -10) sw.reset(); else setExpanded(!expanded); }} style={{ padding: "16px 20px", cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e", fontFamily: "'DM Sans', sans-serif" }}>{conn.name}</div>
              <div style={{ fontSize: 12, color: "#8E8E93", marginTop: 2 }}>{conn.type}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StatusDot status={conn.status} /><span style={{ fontSize: 12, color: "#8E8E93" }}>{conn.status}</span>
              <ChevronIcon expanded={expanded} />
            </div>
          </div>
        </div>
        <div style={{ maxHeight: expanded ? 400 : 0, overflow: "hidden", transition: "max-height 0.35s ease" }}>
          <div style={{ padding: "0 20px 16px", borderTop: "1px solid #F2F2F7" }}>
            <DetailGrid details={conn.details} />
            {/* Inline action buttons */}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={(e) => { e.stopPropagation(); onEdit(conn); }}
                style={{ flex: 1, padding: "10px 0", border: "1.5px solid #007AFF", borderRadius: 12, background: "transparent", color: "#007AFF", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <EditIcon /> Изменить
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(conn); }}
                style={{ flex: 1, padding: "10px 0", border: "1.5px solid #FF3B30", borderRadius: 12, background: "transparent", color: "#FF3B30", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <TrashIcon /> Удалить
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════ */
export default function App() {
  const [activeVariant, setActiveVariant] = useState(1);
  const [sheetConn, setSheetConn] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2000); };

  const variants = [
    { id: 1, label: "Свайп + аккордеон", desc: "Свайп в свёрнутом, блок в развёрнутом", hint: "Свайпните влево (свёрнутую) · Тап — развернуть" },
    { id: 2, label: "Свайп + Sheet", desc: "Тап открывает шторку снизу", hint: "Свайпните влево для действий · Тап — шторка" },
    { id: 3, label: "Long Press", desc: "Долгое нажатие → контекстное меню", hint: "Тап — развернуть · Удержание — меню" },
    { id: "A", label: "←→ Разные", desc: "Влево = действия, вправо = детали", hint: "← влево = действия · → вправо = открыть детали" },
    { id: "B", label: "Мини-превью", desc: "Ключевая инфо видна, свайп всегда", hint: "Свайпните влево · Тап — полные детали" },
    { id: "C", label: "Шаги свайпа", desc: "Короткий = кнопки, длинный = удалить", hint: "Короткий свайп = кнопки · Длинный = удалить сразу" },
    { id: "D", label: "FAB кнопки", desc: "Круглые кнопки поверх карточки", hint: "Свайпните влево — появятся кнопки · Тап — развернуть" },
    { id: "E", label: "Inline кнопки", desc: "Свайп свёрнутой, кнопки в развёрнутой", hint: "Свёрнутая — свайп · Развёрнутая — кнопки внизу" },
  ];

  const current = variants.find((v) => v.id === activeVariant);

  const renderCards = () => connections.map((conn) => {
    const props = { key: conn.id, conn, onDelete: (c) => showToast(`Удалено: ${c.name}`), onEdit: (c) => showToast(`Редактирование: ${c.name}`) };
    switch (activeVariant) {
      case 1: return <Variant1 {...props} />;
      case 2: return <Variant2 {...props} onOpenSheet={setSheetConn} />;
      case 3: return <Variant3 {...props} />;
      case "A": return <VariantA {...props} />;
      case "B": return <VariantB {...props} />;
      case "C": return <VariantC {...props} />;
      case "D": return <VariantD {...props} />;
      case "E": return <VariantE {...props} />;
      default: return null;
    }
  });

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", minHeight: "100vh", background: "#F5F5FA", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes menuFadeIn { from { opacity:0; transform:scale(0.9) } to { opacity:1; transform:scale(1) } }
        @keyframes toastIn { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fabIn { from { opacity:0; transform:scale(0.5) } to { opacity:1; transform:scale(1) } }
        * { box-sizing:border-box; -webkit-tap-highlight-color:transparent }
      `}</style>

      {/* Header */}
      <div style={{ padding: "20px 20px 16px", background: "#fff", borderBottom: "1px solid #E8E8ED", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", marginBottom: 14 }}>Подключения</div>

        {/* Variant grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          {variants.map((v) => (
            <button key={v.id} onClick={() => setActiveVariant(v.id)}
              style={{
                padding: "8px 4px", border: "none", borderRadius: 10, fontSize: 11, fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
                background: activeVariant === v.id ? "#1a1a2e" : "#F2F2F7",
                color: activeVariant === v.id ? "#fff" : "#8E8E93",
                transition: "all 0.2s ease",
              }}>
              {v.id}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>{current?.label}</div>
          <div style={{ fontSize: 12, color: "#8E8E93", marginTop: 2 }}>{current?.desc}</div>
        </div>
      </div>

      {/* Hint */}
      <div style={{ margin: "16px 20px 4px", padding: "10px 14px", background: "#E8F0FE", borderRadius: 12, fontSize: 12, color: "#3C6BC5", display: "flex", alignItems: "center", gap: 8 }}>
        💡 {current?.hint}
      </div>

      {/* Cards */}
      <div style={{ padding: "12px 20px 40px" }}>
        {renderCards()}
      </div>

      {sheetConn && <BottomSheet conn={sheetConn} onClose={() => setSheetConn(null)} />}

      {toast && (
        <div style={{ position: "fixed", bottom: 30, left: "50%", transform: "translateX(-50%)", background: "#1a1a2e", color: "#fff", padding: "12px 24px", borderRadius: 14, fontSize: 14, fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", zIndex: 200, animation: "toastIn 0.3s ease" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
