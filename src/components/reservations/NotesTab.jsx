import { useState, useEffect } from 'react'
import { Trash2, Archive, ArchiveRestore, Plus, FileText, Inbox } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Textarea } from '../ui/textarea'
import { Badge } from '../ui/badge'
import { Alert, AlertDescription } from '../ui/alert'
import { ScrollArea } from '../ui/scroll-area'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog'
import {
  getActiveReservationNotes,
  getArchivedReservationNotes,
  createReservationNote,
  archiveReservationNote,
  unarchiveReservationNote,
  deleteReservationNote
} from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function NotesTab({ reservationId }) {
  const { user } = useAuth()
  const [activeNotes, setActiveNotes] = useState([])
  const [archivedNotes, setArchivedNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedView, setSelectedView] = useState('active') // 'active' or 'archived'
  const [deleteDialog, setDeleteDialog] = useState({ open: false, noteId: null, isArchived: false })
  const [alertMessage, setAlertMessage] = useState(null)

  useEffect(() => {
    loadNotes()
  }, [reservationId])

  const loadNotes = async () => {
    try {
      const [activeResult, archivedResult] = await Promise.all([
        getActiveReservationNotes(reservationId),
        getArchivedReservationNotes(reservationId)
      ])

      if (activeResult.error) {
        console.error('Error loading active notes:', activeResult.error)
        showAlert('Failed to load active notes', 'destructive')
      } else {
        setActiveNotes(activeResult.data || [])
      }

      if (archivedResult.error) {
        console.error('Error loading archived notes:', archivedResult.error)
      } else {
        setArchivedNotes(archivedResult.data || [])
      }
    } catch (error) {
      console.error('Error loading notes:', error)
    }
  }

  const showAlert = (message, variant = 'default') => {
    setAlertMessage({ message, variant })
    setTimeout(() => setAlertMessage(null), 3000)
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      showAlert('Please enter a note', 'destructive')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await createReservationNote({
        reservation_id: reservationId,
        note_text: newNote.trim(),
        created_by: user?.id,
        created_by_name: user?.name || user?.email || 'Unknown User',
        is_archived: false
      })

      if (error) {
        console.error('Error creating note:', error)
        showAlert('Failed to create note', 'destructive')
      } else {
        setActiveNotes([data[0], ...activeNotes])
        setNewNote('')
        showAlert('Note added successfully', 'default')
      }
    } catch (error) {
      console.error('Error creating note:', error)
      showAlert('Failed to create note', 'destructive')
    } finally {
      setLoading(false)
    }
  }

  const handleArchiveNote = async (noteId) => {
    try {
      const { error } = await archiveReservationNote(noteId)

      if (error) {
        console.error('Error archiving note:', error)
        showAlert('Failed to archive note', 'destructive')
      } else {
        // Move note from active to archived
        const note = activeNotes.find(n => n.id === noteId)
        if (note) {
          setActiveNotes(activeNotes.filter(n => n.id !== noteId))
          setArchivedNotes([{ ...note, is_archived: true }, ...archivedNotes])
          showAlert('Note archived successfully', 'default')
        }
      }
    } catch (error) {
      console.error('Error archiving note:', error)
      showAlert('Failed to archive note', 'destructive')
    }
  }

  const handleUnarchiveNote = async (noteId) => {
    try {
      const { error } = await unarchiveReservationNote(noteId)

      if (error) {
        console.error('Error unarchiving note:', error)
        showAlert('Failed to unarchive note', 'destructive')
      } else {
        // Move note from archived to active
        const note = archivedNotes.find(n => n.id === noteId)
        if (note) {
          setArchivedNotes(archivedNotes.filter(n => n.id !== noteId))
          setActiveNotes([{ ...note, is_archived: false }, ...activeNotes])
          showAlert('Note unarchived successfully', 'default')
        }
      }
    } catch (error) {
      console.error('Error unarchiving note:', error)
      showAlert('Failed to unarchive note', 'destructive')
    }
  }

  const confirmDeleteNote = (noteId, isArchived) => {
    setDeleteDialog({ open: true, noteId, isArchived })
  }

  const handleDeleteNote = async () => {
    const { noteId, isArchived } = deleteDialog

    try {
      const { error } = await deleteReservationNote(noteId)

      if (error) {
        console.error('Error deleting note:', error)
        showAlert('Failed to delete note', 'destructive')
      } else {
        if (isArchived) {
          setArchivedNotes(archivedNotes.filter(n => n.id !== noteId))
        } else {
          setActiveNotes(activeNotes.filter(n => n.id !== noteId))
        }
        showAlert('Note deleted successfully', 'default')
      }
    } catch (error) {
      console.error('Error deleting note:', error)
      showAlert('Failed to delete note', 'destructive')
    } finally {
      setDeleteDialog({ open: false, noteId: null, isArchived: false })
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const currentNotes = selectedView === 'active' ? activeNotes : archivedNotes

  return (
    <div className="flex gap-6">
      {/* Left Sidebar Menu */}
      <div className="w-64 flex-shrink-0">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filter Notes</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden">
            <div className="flex flex-col">
              <Button
                variant={selectedView === 'active' ? 'default' : 'ghost'}
                onClick={() => setSelectedView('active')}
                className="flex items-center justify-between px-4 py-3 h-auto rounded-none border-b"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Active Notes</span>
                </div>
                <Badge variant={selectedView === 'active' ? 'secondary' : 'outline'}>
                  {activeNotes.length}
                </Badge>
              </Button>
              <Button
                variant={selectedView === 'archived' ? 'default' : 'ghost'}
                onClick={() => setSelectedView('archived')}
                className="flex items-center justify-between px-4 py-3 h-auto rounded-none rounded-b-lg"
              >
                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  <span>Archived Notes</span>
                </div>
                <Badge variant={selectedView === 'archived' ? 'secondary' : 'outline'}>
                  {archivedNotes.length}
                </Badge>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-4">
        {/* Alert Message */}
        {alertMessage && (
          <Alert variant={alertMessage.variant}>
            <AlertDescription>{alertMessage.message}</AlertDescription>
          </Alert>
        )}

        {/* Add New Note Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Note
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Enter your note here..."
              className="min-h-[100px]"
            />
            <div className="flex justify-end">
              <Button onClick={handleAddNote} disabled={loading || !newNote.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notes List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {selectedView === 'active' ? (
                <>
                  <FileText className="h-5 w-5" />
                  Active Notes
                </>
              ) : (
                <>
                  <Archive className="h-5 w-5" />
                  Archived Notes
                </>
              )}
              <Badge variant="default">{currentNotes.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Inbox className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {selectedView === 'active' ? 'No active notes' : 'No archived notes'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentNotes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      selectedView === 'active'
                        ? 'bg-card hover:bg-muted/50'
                        : 'bg-muted/20 hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <p className={`whitespace-pre-wrap ${
                          selectedView === 'archived' ? 'text-muted-foreground' : 'text-foreground'
                        }`}>
                          {note.note_text}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>By {note.created_by_name || 'Unknown'}</span>
                          <span>•</span>
                          <span>{formatDate(note.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {selectedView === 'active' ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleArchiveNote(note.id)}
                              title="Archive note"
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmDeleteNote(note.id, false)}
                              title="Delete note"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleUnarchiveNote(note.id)}
                              title="Unarchive note"
                            >
                              <ArchiveRestore className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmDeleteNote(note.id, true)}
                              title="Delete note"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, noteId: null, isArchived: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this note. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNote} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
