import bcrypt from 'bcryptjs';
import { teacherRepo } from '../repositories/teacherRepo.js';
import { Errors } from '../errors.js';

const BCRYPT_COST = 12;

export const authService = {
  async register(input: { name: string; email: string; password: string }) {
    const email = input.email.toLowerCase().trim();
    const existing = await teacherRepo.findByEmail(email);
    if (existing) {
      throw Errors.conflict('E-mail já cadastrado');
    }
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
    const teacher = await teacherRepo.create({
      name: input.name.trim(),
      email,
      passwordHash,
    });
    return publicTeacher(teacher);
  },

  async login(input: { email: string; password: string }) {
    const email = input.email.toLowerCase().trim();
    const teacher = await teacherRepo.findByEmail(email);
    if (!teacher) {
      throw Errors.unauthorized('E-mail ou senha inválidos');
    }
    const ok = await bcrypt.compare(input.password, teacher.passwordHash);
    if (!ok) {
      throw Errors.unauthorized('E-mail ou senha inválidos');
    }
    return publicTeacher(teacher);
  },

  async me(teacherId: string) {
    const teacher = await teacherRepo.findById(teacherId);
    if (!teacher) {
      throw Errors.unauthorized();
    }
    return publicTeacher(teacher);
  },
};

function publicTeacher(teacher: {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}) {
  return {
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
    createdAt: teacher.createdAt,
  };
}
