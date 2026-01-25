import React from 'react';
import { IonToggle } from '@ionic/react';

interface ExerciseToggleProps {
  showExerciseWithEquipment: boolean;
  setShowExerciseWithEquipment: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function ExerciseToggle({
  showExerciseWithEquipment,
  setShowExerciseWithEquipment,
}: ExerciseToggleProps) {
  return (
    <IonToggle
      checked={showExerciseWithEquipment}
      onIonChange={(e) => setShowExerciseWithEquipment(e.detail.checked)}>
      <p className='text-center'>
        Include Movements<br></br> That Require Equipment
      </p>
    </IonToggle>
  );
}
