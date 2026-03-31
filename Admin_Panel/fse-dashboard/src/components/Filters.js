import React from "react";
import { Grid, FormControl, InputLabel, Select, MenuItem } from "@mui/material";

function Filters({
  data,
  filters,
  setFilters
}) {

  const uniqueValues = (key) => {
    return [...new Set(data.map(item => item[key]).filter(Boolean))];
  };

  const handleChange = (key, value) => {
    setFilters({
      ...filters,
      [key]: value
    });
  };

  return (

    <Grid container spacing={3} style={{ marginBottom: "20px" }}>

      {/* TL FILTER */}
      <Grid item xs={12} md={2}>
        <FormControl fullWidth>
          <InputLabel>Team Leader</InputLabel>
          <Select
            value={filters.TL}
            label="Team Leader"
            onChange={(e) => handleChange("TL", e.target.value)}
          >
            <MenuItem value="">All</MenuItem>

            {uniqueValues("TL").map((tl, index) => (
              <MenuItem key={index} value={tl}>
                {tl}
              </MenuItem>
            ))}

          </Select>
        </FormControl>
      </Grid>


      {/* EMPLOYEE FILTER */}
      <Grid item xs={12} md={2}>
        <FormControl fullWidth>
          <InputLabel>Employee</InputLabel>
          <Select
            value={filters.Name}
            label="Employee"
            onChange={(e) => handleChange("Name", e.target.value)}
          >
            <MenuItem value="">All</MenuItem>

            {uniqueValues("Name").map((name, index) => (
              <MenuItem key={index} value={name}>
                {name}
              </MenuItem>
            ))}

          </Select>
        </FormControl>
      </Grid>


      {/* PRODUCT FILTER */}
      <Grid item xs={12} md={2}>
        <FormControl fullWidth>
          <InputLabel>Product</InputLabel>
          <Select
            value={filters.Product}
            label="Product"
            onChange={(e) => handleChange("Product", e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Tide OB">Tide OB</MenuItem>
            <MenuItem value="Tide Insurance">Tide Insurance</MenuItem>
            <MenuItem value="Vehicle Insurance">Vehicle Insurance</MenuItem>
            <MenuItem value="Aditya Birla">Aditya Birla</MenuItem>
            <MenuItem value="Airtel Payments Bank">Airtel Payments Bank</MenuItem>
          </Select>
        </FormControl>
      </Grid>


      {/* EMPLOYEE STATUS */}
      <Grid item xs={12} md={3}>
        <FormControl fullWidth>
          <InputLabel>Employee Status</InputLabel>
          <Select
            value={filters["Employee status"]}
            label="Employee Status"
            onChange={(e) =>
              handleChange("Employee status", e.target.value)
            }
          >
            <MenuItem value="">All</MenuItem>

            {uniqueValues("Employee status").map((status, index) => (
              <MenuItem key={index} value={status}>
                {status}
              </MenuItem>
            ))}

          </Select>
        </FormControl>
      </Grid>


      {/* EMPLOYMENT TYPE */}
      <Grid item xs={12} md={3}>
        <FormControl fullWidth>
          <InputLabel>Employment Type</InputLabel>
          <Select
            value={filters["Employment type"]}
            label="Employment Type"
            onChange={(e) =>
              handleChange("Employment type", e.target.value)
            }
          >
            <MenuItem value="">All</MenuItem>

            {uniqueValues("Employment type").map((type, index) => (
              <MenuItem key={index} value={type}>
                {type}
              </MenuItem>
            ))}

          </Select>
        </FormControl>
      </Grid>

    </Grid>

  );
}

export default Filters;