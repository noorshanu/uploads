"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Project_1 = __importDefault(require("../models/Project"));
const router = (0, express_1.Router)();
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { owner } = req.query;
    const projects = yield Project_1.default.find({ owner });
    res.json(projects);
}));
router.get('/total-projects', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const totalProjects = yield Project_1.default.countDocuments();
    res.json({ totalProjects });
}));
router.post('/create', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, description, owner } = req.body;
    const totalProjects = yield Project_1.default.countDocuments();
    const project = yield Project_1.default.create({ name, description, owner, id: totalProjects + 1 });
    res.json(project);
}));
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const project = yield Project_1.default.findById(id);
    res.json(project);
}));
exports.default = router;
