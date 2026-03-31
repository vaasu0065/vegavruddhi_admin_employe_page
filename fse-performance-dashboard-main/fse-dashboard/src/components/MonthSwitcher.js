import React from "react";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";

function MonthSwitcher({ month, setMonth }) {

  const months = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" }
  ];

  return (

    <FormControl sx={{ width: 200, marginBottom: 3 }}>

      <InputLabel>Month</InputLabel>

      <Select
        value={month}
        label="Month"
        onChange={(e) => setMonth(e.target.value)}
      >

        <MenuItem value="">All</MenuItem>

        {months.map((m) => (
          <MenuItem key={m.value} value={m.value}>
            {m.label}
          </MenuItem>
        ))}

      </Select>

    </FormControl>

  );

}

export default MonthSwitcher;