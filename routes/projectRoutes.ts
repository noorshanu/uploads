import { Router, Request, Response } from 'express';
import Project from '../models/Project';
import { createToken2 } from '../services/createToken';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    const { owner } = req.query;
    const projects = await Project.find({ owner });
    res.json(projects);
});

router.get('/total-projects', async (req: Request, res: Response) => {
    const totalProjects = await Project.countDocuments();
    res.json({ totalProjects });
});

router.post('/create', async (req: Request, res: Response) => {
    const { name, description, owner } = req.body;
    const totalProjects = await Project.countDocuments();
    const project = await Project.create({ name, description, owner, id: totalProjects + 1 });
    res.json(project);
});


router.get('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const project = await Project.findById(id);
    res.json(project);
});

export default router;