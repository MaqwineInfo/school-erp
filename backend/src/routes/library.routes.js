const router = require('express').Router();
const ctrl = require('../controllers/library.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission, applyBranchScope, audit } = require('../middleware/rbac');

router.use(authenticate, applyBranchScope);
router.get('/books', checkPermission('library', 'view'), ctrl.listBooks);
router.post('/books', checkPermission('library', 'add'), audit('library', 'create'), ctrl.addBook);
router.put('/books/:id', checkPermission('library', 'edit'), audit('library', 'update'), ctrl.updateBook);
router.delete('/books/:id', checkPermission('library', 'delete'), audit('library', 'delete'), ctrl.removeBook);

router.get('/issues', checkPermission('library', 'view'), ctrl.listIssues);
router.post('/issues', checkPermission('library', 'add'), audit('library', 'issue'), ctrl.issueBook);
router.patch('/issues/:id/return', checkPermission('library', 'edit'), audit('library', 'return'), ctrl.returnBook);

module.exports = router;
