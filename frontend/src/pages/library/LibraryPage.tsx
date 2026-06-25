import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, BookOpen, RotateCcw } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge, statusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { libraryService } from '../../services';
import type { Book, BookIssue } from '../../types';

const categoryOptions = ['fiction','reference','story','textbook','encyclopedia','magazine','journal','ebook','other'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));

export default function LibraryPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'books' | 'issues'>('books');
  const [search, setSearch] = useState('');
  const [showAddBook, setShowAddBook] = useState(false);
  const [showIssueBook, setShowIssueBook] = useState(false);
  const [bookForm, setBookForm] = useState<Partial<Book>>({ totalCopies: 1, category: 'textbook' });
  const [issueForm, setIssueForm] = useState({ bookId: '', memberId: '', memberType: 'student', dueDate: '' });

  const { data: books, isLoading: booksLoading } = useQuery({ queryKey: ['books', search], queryFn: () => libraryService.listBooks({ search: search || undefined }) });
  const { data: issues, isLoading: issuesLoading } = useQuery({ queryKey: ['book-issues'], queryFn: () => libraryService.listIssues() });

  const addBookMutation = useMutation({ mutationFn: libraryService.addBook, onSuccess: () => { qc.invalidateQueries({ queryKey: ['books'] }); setShowAddBook(false); } });
  const issueMutation = useMutation({ mutationFn: libraryService.issueBook, onSuccess: () => { qc.invalidateQueries({ queryKey: ['book-issues', 'books'] }); setShowIssueBook(false); } });
  const returnMutation = useMutation({ mutationFn: libraryService.returnBook, onSuccess: () => qc.invalidateQueries({ queryKey: ['book-issues', 'books'] }) });

  const bookColumns = [
    { key: 'title', header: 'Title', render: (b: Book) => <span className="font-medium">{b.title}</span> },
    { key: 'author', header: 'Author' },
    { key: 'category', header: 'Category', render: (b: Book) => <Badge variant="info">{b.category}</Badge> },
    { key: 'totalCopies', header: 'Total' },
    { key: 'availableCopies', header: 'Available', render: (b: Book) => <span className={b.availableCopies > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{b.availableCopies}</span> },
    { key: 'rackNo', header: 'Rack' },
  ];

  const issueColumns = [
    { key: 'book', header: 'Book', render: (i: BookIssue) => typeof i.bookId === 'object' ? (i.bookId as { title: string }).title : '—' },
    { key: 'memberId', header: 'Member ID' },
    { key: 'memberType', header: 'Type', render: (i: BookIssue) => <Badge variant={i.memberType === 'student' ? 'info' : 'purple'}>{i.memberType}</Badge> },
    { key: 'issueDate', header: 'Issue Date', render: (i: BookIssue) => new Date(i.issueDate).toLocaleDateString('en-IN') },
    { key: 'dueDate', header: 'Due Date', render: (i: BookIssue) => new Date(i.dueDate).toLocaleDateString('en-IN') },
    { key: 'status', header: 'Status', render: (i: BookIssue) => <Badge variant={statusBadge(i.status)}>{i.status}</Badge> },
    { key: 'actions', header: '', render: (i: BookIssue) => i.status === 'issued' ? (
      <Button size="sm" variant="outline" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={() => returnMutation.mutate(i._id)}>Return</Button>
    ) : null },
  ];

  return (
    <div>
      <PageHeader
        title="Library Management"
        description="Manage books, issue and return records"
        breadcrumb={[{ label: 'Home' }, { label: 'Library' }]}
        actions={
          <>
            <Button variant="outline" icon={<BookOpen className="w-4 h-4" />} onClick={() => setShowIssueBook(true)}>Issue Book</Button>
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddBook(true)}>Add Book</Button>
          </>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {['books', 'issues'].map(t => (
          <button key={t} onClick={() => setTab(t as 'books' | 'issues')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'books' ? 'Books Catalogue' : 'Issue / Return'}
          </button>
        ))}
      </div>

      {tab === 'books' ? (
        <>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search title or author..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <Table columns={bookColumns} data={books?.data || []} loading={booksLoading} emptyMessage="No books in catalogue" />
        </>
      ) : (
        <Table columns={issueColumns} data={issues?.data || []} loading={issuesLoading} emptyMessage="No issue records" />
      )}

      {/* Add Book Modal */}
      <Modal isOpen={showAddBook} onClose={() => setShowAddBook(false)} title="Add Book to Catalogue" size="md"
        footer={<div className="flex gap-3 justify-end"><Button variant="outline" onClick={() => setShowAddBook(false)}>Cancel</Button><Button loading={addBookMutation.isPending} onClick={() => addBookMutation.mutate(bookForm)}>Add Book</Button></div>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Input label="Book Title *" value={bookForm.title || ''} onChange={e => setBookForm(f => ({ ...f, title: e.target.value }))} /></div>
          <Input label="Author" value={bookForm.author || ''} onChange={e => setBookForm(f => ({ ...f, author: e.target.value }))} />
          <Input label="ISBN" value={bookForm.isbn || ''} onChange={e => setBookForm(f => ({ ...f, isbn: e.target.value }))} />
          <Input label="Publisher" value={bookForm.publisher || ''} onChange={e => setBookForm(f => ({ ...f, publisher: e.target.value }))} />
          <Select label="Category" value={bookForm.category || 'textbook'} onChange={e => setBookForm(f => ({ ...f, category: e.target.value }))} options={categoryOptions} />
          <Input label="Total Copies" type="number" value={bookForm.totalCopies || 1} onChange={e => setBookForm(f => ({ ...f, totalCopies: +e.target.value }))} />
          <Input label="Rack No." value={bookForm.rackNo || ''} onChange={e => setBookForm(f => ({ ...f, rackNo: e.target.value }))} />
        </div>
      </Modal>

      {/* Issue Book Modal */}
      <Modal isOpen={showIssueBook} onClose={() => setShowIssueBook(false)} title="Issue Book to Member" size="md"
        footer={<div className="flex gap-3 justify-end"><Button variant="outline" onClick={() => setShowIssueBook(false)}>Cancel</Button><Button loading={issueMutation.isPending} onClick={() => issueMutation.mutate(issueForm)}>Issue</Button></div>}>
        <div className="space-y-4">
          <Select label="Book" value={issueForm.bookId} onChange={e => setIssueForm(f => ({ ...f, bookId: e.target.value }))} options={(books?.data || []).filter(b => b.availableCopies > 0).map(b => ({ value: b._id, label: `${b.title} (${b.availableCopies} available)` }))} placeholder="Select book" />
          <Input label="Member ID (Student/Staff)" value={issueForm.memberId} onChange={e => setIssueForm(f => ({ ...f, memberId: e.target.value }))} />
          <Select label="Member Type" value={issueForm.memberType} onChange={e => setIssueForm(f => ({ ...f, memberType: e.target.value }))} options={[{ value: 'student', label: 'Student' }, { value: 'staff', label: 'Staff' }]} />
          <Input type="date" label="Due Date" value={issueForm.dueDate} onChange={e => setIssueForm(f => ({ ...f, dueDate: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
