import React from "react";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";

function MonthSlicer({ data, selectedMonth, setSelectedMonth }) {

  const getMonths = () => {
    if (!data || data.length === 0) return [];
    const monthMap = new Map();
    data.forEach(item => {
      Object.keys(item).forEach(col => {
        const date = new Date(col);
        if (!isNaN(date)) {
          const label = date.toLocaleString("default", { month: "long", year: "numeric" });
          const key = date.getFullYear() * 100 + (date.getMonth() + 1);
          if (!monthMap.has(label)) monthMap.set(label, key);
        }
      });
    });
    return Array.from(monthMap.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([label]) => label);
  };

  return (

    <FormControl style={{ minWidth: 200, marginBottom: "20px" }}>

      <InputLabel>Month</InputLabel>

      <Select
        value={selectedMonth}
        label="Month"
        onChange={(e) => setSelectedMonth(e.target.value)}
      >

        <MenuItem value="">All</MenuItem>

        {getMonths().map((month, index) => (

          <MenuItem key={index} value={month}>
            {month}
          </MenuItem>

        ))}

      </Select>

    </FormControl>

  );

}

export default MonthSlicer;