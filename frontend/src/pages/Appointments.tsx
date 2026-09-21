import { useState } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Chip } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '../services/api';
import { format } from 'date-fns';

interface Appointment {
  id: string;
  status: string;
  start: string;
  end: string;
  participant: { actor: { display: string } }[];
  reasonText?: string;
}

const Appointments = () => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: appointments, isLoading } = useQuery<Appointment[]>('appointments', async () => {
    const res = await api.get('/fhir/Appointment');
    return res.data.entry?.map((e: any) => e.resource) || [];
  });

  const createMutation = useMutation(
    (newAppt: any) => api.post('/fhir/Appointment', newAppt),
    {
      onSuccess: () => queryClient.invalidateQueries('appointments'),
    }
  );

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const appointment = {
      resourceType: 'Appointment',
      status: formData.get('status') as string,
      start: formData.get('start'),
      end: formData.get('end'),
      participant: [
        {
          actor: { display: formData.get('doctor') as string },
        },
      ],
      reasonText: formData.get('reason') as string,
    };
    await createMutation.mutateAsync(appointment);
    setOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'booked': return 'primary';
      case 'fulfilled': return 'success';
      case 'cancelled': return 'error';
      case 'noshow': return 'warning';
      default: return 'default';
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>Appointments</h1>
        <Button variant="contained" onClick={() => setOpen(true)}>New Appointment</Button>
      </div>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Doctor</TableCell>
              <TableCell>Date/Time</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Reason</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5}>Loading...</TableCell></TableRow>
            ) : appointments?.map((appt) => (
              <TableRow key={appt.id} hover>
                <TableCell>{appt.id}</TableCell>
                <TableCell>{appt.participant?.[0]?.actor?.display || '-'}</TableCell>
                <TableCell>{format(new Date(appt.start), 'PPpp')}</TableCell>
                <TableCell>
                  <Chip label={appt.status} color={getStatusColor(appt.status) as any} size="small" />
                </TableCell>
                <TableCell>{appt.reasonText || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Appointment</DialogTitle>
        <DialogContent>
          <form id="appointment-form" onSubmit={handleCreate}>
            <TextField margin="dense" name="doctor" label="Doctor Name" fullWidth required />
            <TextField margin="dense" name="start" label="Start Date/Time" type="datetime-local" fullWidth required InputLabelProps={{ shrink: true }} />
            <TextField margin="dense" name="end" label="End Date/Time" type="datetime-local" fullWidth required InputLabelProps={{ shrink: true }} />
            <FormControl margin="dense" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select name="status" label="Status" defaultValue="booked">
                <MenuItem value="booked">Booked</MenuItem>
                <MenuItem value="fulfilled">Fulfilled</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
                <MenuItem value="noshow">No Show</MenuItem>
              </Select>
            </FormControl>
            <TextField margin="dense" name="reason" label="Reason" fullWidth multiline rows={2} />
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="appointment-form" variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Appointments;
