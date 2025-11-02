import React, { FC } from 'react';
import { DailyCheckin } from '../../../types';
import DailyCheckinViewer from '../../client_detail/DailyCheckinViewer';

interface DailyTrackingTabProps {
    checkins: DailyCheckin[];
}

export const DailyTrackingTab: FC<DailyTrackingTabProps> = ({ checkins }) => {
    return <DailyCheckinViewer checkins={checkins} />;
};