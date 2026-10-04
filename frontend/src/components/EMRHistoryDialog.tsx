import React from 'react';
import { Dialog, DialogContent, Slide } from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import { EMRDashboard } from '../pages/EMRDashboard';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export interface EMRHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  patientId?: string;
  patientData?: any;
}

export const EMRHistoryDialog: React.FC<EMRHistoryDialogProps> = ({
  open,
  onClose,
  patientId,
  patientData,
}) => {
  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      PaperProps={{
        sx: {
          bgcolor: '#f8fafc',
          p: { xs: 1.5, md: 3 },
          overflowY: 'auto',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        {open && (
          <EMRDashboard
            isDialogMode
            patientId={patientId}
            patientData={patientData}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EMRHistoryDialog;
