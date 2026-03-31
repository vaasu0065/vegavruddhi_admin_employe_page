import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from "@mui/material";

function EmployeeStatusTable({ open, handleClose, data, status }) {

  const filteredEmployees = data.filter(
    (item) => item["Employee status"] === status
  );

  return (

    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>

      <DialogTitle>
        Employees with Status: {status}
      </DialogTitle>

      <DialogContent>

        <Table>

          <TableHead>

            <TableRow>

              <TableCell>Name</TableCell>
              <TableCell>Team Leader</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Employment Type</TableCell>

            </TableRow>

          </TableHead>

          <TableBody>

            {filteredEmployees.map((emp, index) => (

              <TableRow key={index}>

                <TableCell>{emp["Name"]}</TableCell>
                <TableCell>{emp["TL"]}</TableCell>
                <TableCell>{emp["Employee status"]}</TableCell>
                <TableCell>{emp["Employment type"]}</TableCell>

              </TableRow>

            ))}

          </TableBody>

        </Table>

      </DialogContent>

    </Dialog>

  );

}

export default EmployeeStatusTable;