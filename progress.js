const ACTIVITY_KEY = "activity_log_v1";

function loadActivity() {
  try { return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]"); }
  catch { return []; }
}

function saveActivity(list) {
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(list));
}

function addActivityEvent(evt) {
  const list = loadActivity();
  list.push(evt);
  // Optional: cap size so it doesn’t grow forever (e.g. last 2000 events)
  if (list.length > 2000) list.splice(0, list.length - 2000);
  saveActivity(list);
}
