"use client";
import { AnimatePresence, m as motion } from "framer-motion";
import {
  ArrowUpRight,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { screenshotFileError } from "./screenshot-storage";
import { Field, SignedScreenshot } from "./ui";
import { CATS, LOSS_CATS, localToday, money } from "./upby-core";

export function LogSheet({ type, initial, isRepeat = false, busy = false, saveError = false, defaultCategory, close, save, remove, customCategories = [], onAddCustom, onUpdateCustom, onRemoveCustom, onMoveCustom }: any) {
  const today = localToday();
  let startingDate = initial?.dateKey || today;
  if (!initial?.dateKey && initial?.date === "Yesterday") {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    startingDate = yesterday.toISOString().slice(0, 10);
  } else if (!initial?.dateKey && /^Sep \d+$/.test(initial?.date || "")) {
    startingDate = `2026-09-${String(initial.date.split(" ")[1]).padStart(2, "0")}`;
  }
  const [kind, setKind] = useState<"win" | "loss">(type || "win"),
    [amount, setAmount] = useState(initial ? String(initial.amount) : ""),
    [title, setTitle] = useState(initial?.title || ""),
    [category, setCategory] = useState(initial?.category || defaultCategory || (type === "loss" ? LOSS_CATS[0][0] : CATS[0][0])),
    [note, setNote] = useState(initial?.note || ""),
    [merchant, setMerchant] = useState(initial?.merchant || ""),
    [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod || ""),
    [date, setDate] = useState(startingDate),
    [custom, setCustom] = useState(false),
    [manageCustom, setManageCustom] = useState(false),
    [categoryDrafts, setCategoryDrafts] = useState<Record<string, string>>({}),
    [customName, setCustomName] = useState(""),
    [customColor, setCustomColor] = useState("#1769ff"),
    [fileName, setFileName] = useState(""),
    [screenshotFile, setScreenshotFile] = useState<File | null>(null),
    [fileError, setFileError] = useState(""),
    [preview, setPreview] = useState<string | null>(null),
    [screenshotAttached, setScreenshotAttached] = useState(Boolean(initial?.screenshot)),
    [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => () => { if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);
  const baseCategories = kind === "loss" ? LOSS_CATS : CATS;
  const savedCategories: Array<[string, string]> = [...customCategories, ...baseCategories].filter(
    ([name], index, items) => items.findIndex(([other]) => other.toLowerCase() === name.toLowerCase()) === index,
  );
  const categoryList: Array<[string, string]> = savedCategories.some(([name]) => name === category)
    ? savedCategories
    : [[category, customColor], ...savedCategories];
  const formatDate = (value: string) => {
    const chosen = new Date(`${value}T00:00:00`);
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (chosen.toDateString() === now.toDateString()) return "Today";
    if (chosen.toDateString() === yesterday.toDateString()) return "Yesterday";
    return chosen.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const applyCustom = () => {
    if (!customName.trim()) return;
    const nextCategory: [string, string] = [customName.trim(), customColor];
    setCategory(nextCategory[0]);
    onAddCustom?.(nextCategory);
    setCustom(false);
    setCustomName("");
  };
  const renameCustom = (currentName: string, color: string) => {
    const nextName = (categoryDrafts[currentName] ?? currentName).trim();
    if (!nextName || nextName === currentName) return;
    onUpdateCustom?.(currentName, [nextName, color]);
    if (category === currentName) setCategory(nextName);
    setCategoryDrafts((items) => {
      const next = { ...items };
      delete next[currentName];
      return next;
    });
  };
  const removeCustom = (name: string) => {
    onRemoveCustom?.(name);
    if (category === name) setCategory(baseCategories[0][0]);
  };
  const changeKind = (nextKind: "win" | "loss") => {
    if (nextKind === kind) return;
    const currentDefaults = kind === "loss" ? LOSS_CATS : CATS;
    const nextDefaults = nextKind === "loss" ? LOSS_CATS : CATS;
    if (currentDefaults.some(([name]) => name === category)) setCategory(nextDefaults[0][0]);
    setKind(nextKind);
  };
  return (
    <motion.div
      className="backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={close}
    >
      <motion.div
        className="sheet log-sheet"
        initial={{ y: 70, opacity: 0, scale: .98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 70, opacity: 0, scale: .98 }}
        transition={{ type: "spring", damping: 29 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <i className="grab" />
        <header>
          <div>
            <span>{isRepeat ? "REPEAT AN ENTRY" : initial ? "UPDATE YOUR ENTRY" : "ADD TO YOUR MONTH"}</span>
            <h2>{isRepeat ? "Repeat progress" : initial ? "Edit progress" : "Log your progress"}</h2>
          </div>
          <button onClick={close}>
            <X />
          </button>
        </header>
        <div className="toggle">
          <button
            className={kind === "win" ? "win" : ""}
            onClick={() => changeKind("win")}
          >
            ↑ WIN
          </button>
          <button
            className={kind === "loss" ? "loss" : ""}
            onClick={() => changeKind("loss")}
          >
            ↓ LOSS
          </button>
        </div>
        <div className="log-form-grid">
          <div className="log-main-fields">
            <label className="amount">
              <span>{kind === "loss" ? "EXPENSE AMOUNT" : "AMOUNT"}</span>
              <div>
                $
                <input
                  inputMode="decimal"
                  aria-label="Amount"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"))}
                />
              </div>
            </label>
            <div className="amount-presets">
              {[100, 500, 1000].map((value) => <button key={value} onClick={() => setAmount(String(value))}>{kind === "win" ? "+" : ""}{money(value)}</button>)}
            </div>
            <Field label={kind === "loss" ? "WHAT WAS IT FOR?" : "PROJECT OR TITLE"}>
              <input
                placeholder={kind === "loss" ? "Subscription, transport, ad spend…" : "What happened?"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            {kind === "loss" && <div className="expense-fields">
              <Field label="PAID TO · OPTIONAL">
                <input placeholder="Person, store or service" value={merchant} maxLength={120} onChange={(e) => setMerchant(e.target.value)} />
              </Field>
              <Field label="PAYMENT METHOD · OPTIONAL">
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="">Not specified</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="crypto">Crypto</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </Field>
            </div>}
            <Field label="NOTE · OPTIONAL">
              <textarea
                placeholder="Add a little context"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
          </div>
          <div className="log-side-fields">
            <div className="category-heading">
              <label className="field-label">{kind === "loss" ? "EXPENSE CATEGORY" : "CATEGORY"}</label>
              {customCategories.length > 0 && <button type="button" onClick={() => setManageCustom((value) => !value)}>{manageCustom ? "DONE" : "MANAGE"}</button>}
            </div>
            <div className="cats">
              {categoryList.map(([c, color]) => (
                <button
                  key={c}
                  className={c === category ? "selected" : ""}
                  style={{ "--cat": color } as any}
                  onClick={() => setCategory(c)}
                >
                  <i />
                  {c}
                  {c === category && <Check />}
                </button>
              ))}
              <button onClick={() => setCustom(!custom)}><Plus />Custom</button>
            </div>
            <AnimatePresence>
              {custom && (
                <motion.div className="custom-category" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <div className="custom-name-row"><input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Category name" /><button disabled={!customName.trim()} onClick={applyCustom}>ADD</button></div>
                  <div className="color-swatches">
                    {["#1769ff", "#6c4cff", "#ff6c64", "#c8ef43", "#ff9f1c"].map((color) => <button className={customColor === color ? "active" : ""} key={color} aria-label={"Use " + color} style={{ background: color }} onClick={() => setCustomColor(color)} />)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {manageCustom && customCategories.length > 0 && <motion.div className="category-manager" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                <header><b>YOUR CATEGORIES</b><span>Rename, reorder or remove</span></header>
                {customCategories.map(([name, color]: [string, string], index: number) => <div className="category-manager-row" key={name}>
                  <i style={{ background: color }} />
                  <input aria-label={`Rename ${name}`} value={categoryDrafts[name] ?? name} maxLength={40} onChange={(event) => setCategoryDrafts((items) => ({ ...items, [name]: event.target.value }))} />
                  <button type="button" aria-label={`Save ${name}`} onClick={() => renameCustom(name, color)}><Check /></button>
                  <button type="button" aria-label={`Move ${name} up`} disabled={index === 0} onClick={() => onMoveCustom?.(name, -1)}><ChevronUp /></button>
                  <button type="button" aria-label={`Move ${name} down`} disabled={index === customCategories.length - 1} onClick={() => onMoveCustom?.(name, 1)}><ChevronDown /></button>
                  <button type="button" className="remove" aria-label={`Remove ${name}`} onClick={() => removeCustom(name)}><Trash2 /></button>
                </div>)}
              </motion.div>}
            </AnimatePresence>
            <div className="log-meta">
              <Field label="DATE">
                <div className="date-field"><CalendarDays /><input type="date" value={date} max={today} onChange={(event) => setDate(event.target.value)} /></div>
              </Field>
              <Field label="SCREENSHOT · OPTIONAL">
                <div className={screenshotAttached ? "upload-field has-file" : "upload-field"}>
                  {preview ? <img src={preview} alt="Screenshot preview" /> : initial?.screenshotPath ? <SignedScreenshot path={initial.screenshotPath} alt="Saved screenshot preview" /> : <Camera />}
                  <label><b>{fileName || (screenshotAttached ? "Screenshot attached" : "Add screenshot")}</b><small>{screenshotAttached ? "Tap to replace" : "PNG, JPG or WebP · 8 MB max"}</small><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
                    const file = event.target.files?.[0];
                    setFileError("");
                    if (!file) return;
                    const validationError = screenshotFileError(file);
                    if (validationError) { setFileError(validationError); event.target.value = ""; return; }
                    setFileName(file.name); setScreenshotFile(file); setPreview(URL.createObjectURL(file)); setScreenshotAttached(true);
                  }} /></label>
                  {screenshotAttached && <button type="button" aria-label="Remove screenshot" onClick={() => { setScreenshotAttached(false); setScreenshotFile(null); setPreview(null); setFileName(""); setFileError(""); }}><X /></button>}
                </div>
                {fileError && <small className="screenshot-file-error" role="alert">{fileError}</small>}
              </Field>
            </div>
          </div>
        </div>
        {saveError && <p role="alert">Entry not saved. Check your connection and tap Retry.</p>}
        <div className="sheet-actions">
          {remove && <button disabled={busy} className={confirmDelete ? "sheet-delete confirm" : "sheet-delete"} onClick={() => confirmDelete ? remove() : setConfirmDelete(true)}><Trash2 />{confirmDelete ? "DELETE THIS LOG?" : "DELETE"}</button>}
          <button
            className={`submit ${kind}`}
            disabled={busy || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || !title.trim() || !date}
            onClick={() => save({ type: kind, amount: Number(amount), title: title.trim(), category, date: formatDate(date), dateKey: date, note: note.trim(), merchant: kind === "loss" ? merchant.trim() : undefined, paymentMethod: kind === "loss" ? paymentMethod : undefined, screenshot: screenshotAttached, screenshotPath: initial?.screenshotPath, screenshotFile, removeScreenshot: !screenshotAttached && Boolean(initial?.screenshotPath) })}
          >
            {busy ? "SAVING…" : saveError ? "RETRY" : initial && !isRepeat ? "SAVE CHANGES" : `LOG ${kind.toUpperCase()}`}
            <ArrowUpRight />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
