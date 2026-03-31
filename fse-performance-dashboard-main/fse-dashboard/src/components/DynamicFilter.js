import React, { useState, useEffect } from "react";
import {
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button
} from "@mui/material";

function DynamicFilter({ data, setFilteredData }) {

  const [filterType, setFilterType] = useState("");
  const [filterValue, setFilterValue] = useState("");

  const filterMap = {
    TL: "TL",
    Employee: "Name",
    Status: "Employee status",
    Employment: "Employment type"
  };

  // -----------------------------
  // RESET FILTER WHEN DATA REFRESHES
  // -----------------------------

  useEffect(() => {
    setFilterType("");
    setFilterValue("");
    setFilteredData(data);
  }, [data]);

  // -----------------------------
  // GET MONTH VALUES
  // -----------------------------

  const getMonths = () => {

    if (!data || data.length === 0) return [];

    const months = new Set();

    Object.keys(data?.[0] || {}).forEach(col => {

      const date = new Date(col);

      if (!isNaN(date)) {

        const monthName = date.toLocaleString("default", { month: "long" });

        months.add(monthName);

      }

    });

    return [...months];

  };

  // -----------------------------
  // GET VALUES BASED ON FILTER
  // -----------------------------

  const getValues = () => {

    if (!filterType) return [];

    // if (filterType === "Month") {
    //   return getMonths();
    // }

    const key = filterMap[filterType];

    return [...new Set(data.map(item => item[key]).filter(Boolean))];

  };

  // -----------------------------
  // FILTER TYPE CHANGE
  // -----------------------------

  const handleFilterType = (value) => {

    setFilterType(value);
    setFilterValue("");

    setFilteredData(data);

  };

  // -----------------------------
  // APPLY FILTER VALUE
  // -----------------------------

  const handleValue = (value) => {

    setFilterValue(value);

    // MONTH FILTER
    if (filterType === "Month") {

      const filtered = data.map(item => {

        const newItem = { ...item };

        let monthMeetings = 0;

        Object.keys(item).forEach(col => {

          const date = new Date(col);

          if (!isNaN(date)) {

            const monthName = date.toLocaleString("default", { month: "long" });

            if (monthName === value) {

              const meeting = Number(item[col]) || 0;
              monthMeetings += meeting;

            } else {

              newItem[col] = 0;

            }

          }

        });

        newItem["Total_Meetings_Calc"] = monthMeetings;

        return newItem;

      });

      setFilteredData(filtered);
      return;

    }

    // NORMAL FILTER

    const key = filterMap[filterType];

    const filtered = data.filter(item => item[key] === value);

    setFilteredData(filtered);

  };

  // -----------------------------
  // RESET FILTER BUTTON
  // -----------------------------

  const resetFilter = () => {

    setFilterType("");
    setFilterValue("");

    setFilteredData(data);

  };

  return (

    <Grid container spacing={3} style={{ marginBottom: "30px" }}>

      {/* FILTER TYPE */}

      <Grid item xs={12} md={3}>

        <FormControl fullWidth>

          <InputLabel>Filter Type</InputLabel>

          <Select
            value={filterType}
            label="Filter Type"
            onChange={(e) => handleFilterType(e.target.value)}
          >

            <MenuItem value="">None</MenuItem>
            <MenuItem value="TL">Team Leader</MenuItem>
            <MenuItem value="Employee">Employee Name</MenuItem>
            <MenuItem value="Status">Employee Status</MenuItem>
            <MenuItem value="Employment">Employment Type</MenuItem>
            {/* <MenuItem value="Month">Month</MenuItem> */}

          </Select>

        </FormControl>

      </Grid>

      {/* FILTER VALUE */}

      <Grid item xs={12} md={3}>

        <FormControl fullWidth>

          <InputLabel>Select Value</InputLabel>

          <Select
            value={filterValue}
            label="Select Value"
            onChange={(e) => handleValue(e.target.value)}
          >

            {getValues().map((value, index) => (

              <MenuItem key={index} value={value}>
                {value}
              </MenuItem>

            ))}

          </Select>

        </FormControl>

      </Grid>

      {/* RESET BUTTON */}

      <Grid item xs={12} md={2}>

        <Button
          variant="contained"
          color="error"
          fullWidth
          onClick={resetFilter}
        >
          Reset
        </Button>

      </Grid>

    </Grid>

  );

}

export default DynamicFilter;