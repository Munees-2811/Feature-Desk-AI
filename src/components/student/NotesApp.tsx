import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Edit3, Plus, FileText, Search, BookOpen, Calendar, Tag, Clock, ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchCanvasNotesHybrid } from '../../lib/db';

interface ClassNote {
  id: string;
  title: string;
  subject: string;
  classLevel: number;
  canvasData: string; // Base64 PNG of the canvas
  pageThumbnails?: { [key: number]: string }; // Multi-page thumbnails
  totalPages?: number;
  currentPage?: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export default function NotesApp() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentClass = (user as any)?.current_class || 1;

  const [notes, setNotes] = useState<ClassNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<ClassNote | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [previewPage, setPreviewPage] = useState(1);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);

  // When selected note changes, reset preview page
  useEffect(() => {
    if (selectedNote) {
      setPreviewPage(selectedNote.currentPage || 1);
    }
  }, [selectedNote]);

  // Load saved notes from localStorage
  useEffect(() => {
    const savedNotes = localStorage.getItem(`class_notes_${(user as any)?.id || 'guest'}`);
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    } else {
      // Demo notes
      setNotes([]);
    }
  }, [user]);

  // Sync with cloud on mount
  useEffect(() => {
    const syncNotesFromCloud = async () => {
      const userId = (user as any)?.id;
      if (!userId || userId === 'guest') return;

      setIsLoadingNotes(true);
      try {
        const cloudNotes = await fetchCanvasNotesHybrid(userId);
        if (cloudNotes && cloudNotes.length > 0) {
          // Compare and merge or just replace?
          // Since cloud is source of truth across browsers, we replace the local state
          // but preserve any local notes that aren't synced yet (ones with 'local_' ID)
          setNotes((prevNotes) => {
             const localOnlyNotes = prevNotes.filter(n => String(n.id).startsWith('local_'));
             const mergedNotes = [...localOnlyNotes, ...cloudNotes];
             
             // Sort by date descending
             mergedNotes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
             return mergedNotes;
          });
        }
      } catch (err) {
        console.error('Failed to sync notes from cloud', err);
      } finally {
        setIsLoadingNotes(false);
      }
    };
    
    syncNotesFromCloud();
  }, [user]);

  // Save notes to localStorage when changed
  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem(`class_notes_${(user as any)?.id || 'guest'}`, JSON.stringify(notes));
    }
  }, [notes, user]);

  const subjectNames: { [key: string]: string } = {
    'MATH': 'Mathematics',
    'SCI': 'Science',
    'ENG': 'English',
    'HIST': 'History',
    'GEO': 'Geography',
    'COMP': 'Computer Science',
    'ART': 'Art',
    'MUSIC': 'Music'
  };

  const subjectColors: { [key: string]: string } = {
    'MATH': '#3B82F6',
    'SCI': '#10B981',
    'ENG': '#8B5CF6',
    'HIST': '#F59E0B',
    'GEO': '#06B6D4',
    'COMP': '#EC4899',
    'ART': '#EF4444',
    'MUSIC': '#6366F1'
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSubject = filterSubject === 'all' || note.subject === filterSubject;
    return matchesSearch && matchesSubject;
  });

  const handleDeleteNote = (id: string) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      setNotes(notes.filter(note => note.id !== id));
      if (selectedNote?.id === id) {
        setSelectedNote(null);
      }
    }
  };

  const handleOpenInCanvas = (note: ClassNote) => {
    // Store the note data to be loaded in canvas
    localStorage.setItem('load_note_in_canvas', JSON.stringify(note));
    navigate('/');
  };

  const handleCreateNewNote = () => {
    // Navigate to canvas with intention to save as note
    localStorage.setItem('create_new_note', 'true');
    navigate('/');
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50 min-h-screen w-full flex">
      {/* Sidebar - Notes List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-green-500 to-emerald-600">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-white flex items-center">
              <BookOpen className="w-5 h-5 mr-2" />
              Class Notes
            </h1>
            <button
              onClick={handleCreateNewNote}
              className="p-2 rounded-full bg-white text-green-600 hover:bg-green-50"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-10 pr-3 py-2 rounded-lg bg-white/90 border-0 focus:ring-2 focus:ring-white text-gray-800 placeholder-gray-500"
            />
          </div>
        </div>

        {/* Subject Filter */}
        <div className="p-3 border-b border-gray-100 bg-gray-50">
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm focus:ring-2 focus:ring-green-500"
          >
            <option value="all">All Subjects</option>
            {Object.entries(subjectNames).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotes.length > 0 ? (
            filteredNotes.map(note => (
              <div
                key={note.id}
                onClick={() => setSelectedNote(note)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${selectedNote?.id === note.id ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                  }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: subjectColors[note.subject] || '#6B7280' }}
                      />
                      <span className="text-xs font-medium text-gray-500">
                        {subjectNames[note.subject] || note.subject}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900 truncate">{note.title}</h3>
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(note.updatedAt).toLocaleDateString()}
                      <span className="mx-2">•</span>
                      <span>Class {note.classLevel}</span>
                    </div>
                  </div>
                </div>
                {note.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {note.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="font-medium">No notes found</p>
              <p className="text-sm mt-1">Create notes from the Writing Canvas</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{notes.length} total notes</span>
            <span>Class {currentClass}</span>
          </div>
        </div>
      </div>

      {/* Main Content - Note Viewer */}
      <div className="flex-1 flex flex-col">
        {selectedNote ? (
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              {/* Note Header */}
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: subjectColors[selectedNote.subject] || '#6B7280' }}
                      />
                      <span className="text-sm font-medium" style={{ color: subjectColors[selectedNote.subject] }}>
                        {subjectNames[selectedNote.subject] || selectedNote.subject}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm text-gray-500">Class {selectedNote.classLevel}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedNote.title}</h2>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenInCanvas(selectedNote)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open in Canvas</span>
                    </button>
                    <button
                      onClick={() => handleDeleteNote(selectedNote.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    Created: {new Date(selectedNote.createdAt).toLocaleString()}
                  </div>
                  <div className="flex items-center">
                    <Edit3 className="w-4 h-4 mr-1" />
                    Updated: {selectedNote.updatedAt ? new Date(selectedNote.updatedAt).toLocaleString() : new Date(selectedNote.createdAt).toLocaleString()}
                  </div>
                </div>

                {selectedNote.tags.length > 0 && (
                  <div className="flex items-center mt-4">
                    <Tag className="w-4 h-4 text-gray-400 mr-2" />
                    <div className="flex gap-2 flex-wrap">
                      {selectedNote.tags.map(tag => (
                        <span key={tag} className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Note Content (Canvas Preview) */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-semibold text-gray-900">Note Preview</h3>
                  {isLoadingNotes && (
                    <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                  )}
                </div>
                  {selectedNote.totalPages && selectedNote.totalPages > 1 && (
                    <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-1 border border-gray-200">
                      <button
                        onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                        disabled={previewPage === 1}
                        className="px-2 py-1 text-gray-600 disabled:opacity-30 hover:bg-gray-200 rounded"
                      >
                        Prev
                      </button>
                      <div className="flex items-center text-sm font-medium text-gray-700 px-2">
                        <span>Page</span>
                        <input
                          type="number"
                          min={1}
                          max={selectedNote.totalPages}
                          value={previewPage}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val >= 1 && val <= (selectedNote.totalPages || 1)) {
                              setPreviewPage(val);
                            }
                          }}
                          className="w-12 text-center mx-1 border border-gray-300 rounded px-1 py-0.5"
                        />
                        <span>/ {selectedNote.totalPages}</span>
                      </div>
                      <button
                        onClick={() => setPreviewPage(p => Math.min(selectedNote.totalPages || 1, p + 1))}
                        disabled={previewPage === selectedNote.totalPages}
                        className="px-2 py-1 text-gray-600 disabled:opacity-30 hover:bg-gray-200 rounded"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
                {(() => {
                  const isSavedPage = previewPage === (selectedNote.currentPage || 1);
                  const fallbackImage = isSavedPage ? selectedNote.canvasData : null;
                  const imageToShow = selectedNote.pageThumbnails?.[previewPage] || fallbackImage;

                  if (imageToShow) {
                    return (
                      <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center min-h-[400px]">
                        <img
                          src={imageToShow}
                          alt={`Note preview page ${previewPage}`}
                          className="w-full h-auto object-contain"
                        />
                      </div>
                    );
                  }

                  return (
                    <div className="border border-dashed border-gray-200 rounded-xl p-12 text-center bg-gray-50 min-h-[400px] flex flex-col items-center justify-center">
                      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium">Thumbnail not available for Page {previewPage}</p>
                      <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
                        This is an older note. The preview for this specific page wasn't saved.
                      </p>
                      <button
                        onClick={() => handleOpenInCanvas(selectedNote)}
                        className="mt-6 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Open in Canvas to View
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-6">
            <div>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Your Class Notes</h3>
              <p className="text-gray-500 mb-6 max-w-md">
                Select a note from the sidebar to view, or create new notes from the Writing Canvas.
              </p>
              <button
                onClick={handleCreateNewNote}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center space-x-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                <span>Create New Note in Canvas</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
