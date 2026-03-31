const BASE = "http://127.0.0.1:8001";

export const fetchData = async (month) => {
  const res = await fetch(`${BASE}/data?month=${month || ""}`);
  return res.json();
};

export const updateRow = async (email, column, value) => {
  const res = await fetch(`${BASE}/update-row`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, column, value }),
  });
  return res.json();
};
