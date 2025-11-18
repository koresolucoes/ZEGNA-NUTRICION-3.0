
import React, { FC } from 'react';
import { File as PersonFile, TeamMember } from '../../../types';
import FileManager from '../../client_detail/FileManager';

interface FilesTabProps {
    files: PersonFile[];
    memberMap: Map<string, TeamMember>;
    onAdd: () => void;
    onDelete: (file: PersonFile) => void;
}

export const FilesTab: FC<FilesTabProps> = ({ files, memberMap, onAdd, onDelete }) => {
    return (
        <section className="fade-in">
             {/* The FileManager component itself was pretty good, just wrapping it for consistency */}
             <FileManager files={files} onAdd={onAdd} onDelete={onDelete} memberMap={memberMap} />
        </section>
    );
};
