import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const SALT_ROUNDS = 12

async function main() {
  console.log('🌱 Starting database seed...\n')

  // Clean existing data (in reverse order of dependencies)
  console.log('🧹 Cleaning existing data...')
  await prisma.assignment.deleteMany()
  await prisma.taskGroupMembership.deleteMany()
  await prisma.taskGroup.deleteMany()
  await prisma.task.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.template.deleteMany()
  await prisma.matrix.deleteMany()
  await prisma.project.deleteMany()
  await prisma.member.deleteMany()
  await prisma.department.deleteMany()
  await prisma.consultancyAccess.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()
  console.log('✅ Cleaned existing data\n')

  // Create demo users
  console.log('👤 Creating demo users...')
  const passwordHash = await bcrypt.hash('Demo123!', SALT_ROUNDS)

  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@racisaas.com',
      name: 'Super Admin',
      passwordHash,
    },
  })

  const user1 = await prisma.user.create({
    data: {
      email: 'sarah.chen@techcorp.com',
      name: 'Sarah Chen',
      passwordHash,
    },
  })

  const user2 = await prisma.user.create({
    data: {
      email: 'michael.rodriguez@designstudio.com',
      name: 'Michael Rodriguez',
      passwordHash,
    },
  })

  const user3 = await prisma.user.create({
    data: {
      email: 'emma.wilson@consulting.com',
      name: 'Emma Wilson',
      passwordHash,
    },
  })

  // Additional users for TechCorp team
  const user4 = await prisma.user.create({
    data: {
      email: 'david.kim@techcorp.com',
      name: 'David Kim',
      passwordHash,
    },
  })

  const user5 = await prisma.user.create({
    data: {
      email: 'jessica.martinez@techcorp.com',
      name: 'Jessica Martinez',
      passwordHash,
    },
  })

  const user6 = await prisma.user.create({
    data: {
      email: 'alex.thompson@techcorp.com',
      name: 'Alex Thompson',
      passwordHash,
    },
  })

  const user7 = await prisma.user.create({
    data: {
      email: 'priya.patel@techcorp.com',
      name: 'Priya Patel',
      passwordHash,
    },
  })

  const user8 = await prisma.user.create({
    data: {
      email: 'james.wilson@techcorp.com',
      name: 'James Wilson',
      passwordHash,
    },
  })

  const user9 = await prisma.user.create({
    data: {
      email: 'sophia.nguyen@techcorp.com',
      name: 'Sophia Nguyen',
      passwordHash,
    },
  })

  const user10 = await prisma.user.create({
    data: {
      email: 'marcus.brown@techcorp.com',
      name: 'Marcus Brown',
      passwordHash,
    },
  })

  const user11 = await prisma.user.create({
    data: {
      email: 'olivia.garcia@techcorp.com',
      name: 'Olivia Garcia',
      passwordHash,
    },
  })

  const user12 = await prisma.user.create({
    data: {
      email: 'ethan.lee@techcorp.com',
      name: 'Ethan Lee',
      passwordHash,
    },
  })

  const user13 = await prisma.user.create({
    data: {
      email: 'emily.johnson@designstudio.com',
      name: 'Emily Johnson',
      passwordHash,
    },
  })

  console.log('✅ Created 14 demo users (password: Demo123!)\n')

  // Create super admin consultancy access
  await prisma.consultancyAccess.create({
    data: {
      userId: superAdmin.id,
      canAccessAllOrgs: true,
      accessLevel: 'ADMIN',
    },
  })

  // Create organizations
  console.log('🏢 Creating organizations...')
  const org1 = await prisma.organization.create({
    data: {
      name: 'TechCorp Solutions',
      slug: 'techcorp',
      type: 'CLIENT',
      settings: {
        defaultMatrixView: 'grid',
        allowGuestAccess: false,
        requireApproval: true,
        notificationSettings: {
          email: true,
          inApp: true,
          digest: 'daily',
        },
      },
    },
  })

  const org2 = await prisma.organization.create({
    data: {
      name: 'Creative Design Studio',
      slug: 'designstudio',
      type: 'CLIENT',
      settings: {
        defaultMatrixView: 'list',
        allowGuestAccess: true,
        requireApproval: false,
        notificationSettings: {
          email: true,
          inApp: true,
          digest: 'weekly',
        },
      },
    },
  })

  const org3 = await prisma.organization.create({
    data: {
      name: 'Global Consulting Partners',
      slug: 'consulting',
      type: 'CONSULTANCY',
      settings: {
        defaultMatrixView: 'grid',
        allowGuestAccess: false,
        requireApproval: true,
        notificationSettings: {
          email: false,
          inApp: true,
          digest: 'instant',
        },
      },
    },
  })

  console.log('✅ Created 3 organizations\n')

  // Create departments for Organization 1
  console.log('🏛️ Creating departments...')
  const deptEngineering = await prisma.department.create({
    data: {
      organizationId: org1.id,
      name: 'Engineering',
      color: '#3B82F6',
      description: 'Software development and technical operations',
    },
  })

  const deptProduct = await prisma.department.create({
    data: {
      organizationId: org1.id,
      name: 'Product',
      color: '#8B5CF6',
      description: 'Product management and design',
    },
  })

  const deptOperations = await prisma.department.create({
    data: {
      organizationId: org1.id,
      name: 'Operations',
      color: '#10B981',
      description: 'Business operations and project coordination',
    },
  })

  console.log('✅ Created departments\n')

  // Create members for Organization 1 (TechCorp)
  console.log('👥 Creating members for TechCorp...')

  const member1 = await prisma.member.create({
    data: {
      userId: user1.id,
      organizationId: org1.id,
      role: 'ADMIN',
      jobTitle: 'VP of Engineering',
      departmentLabels: [deptEngineering.id],
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
      status: 'ACTIVE',
    },
  })

  const member2 = await prisma.member.create({
    data: {
      organizationId: org1.id,
      userId: user4.id, // David Kim
      role: 'MEMBER',
      jobTitle: 'Senior Backend Engineer',
      departmentLabels: [deptEngineering.id],
      status: 'ACTIVE',
    },
  })

  const member3 = await prisma.member.create({
    data: {
      organizationId: org1.id,
      userId: user5.id, // Jessica Martinez
      role: 'MEMBER',
      jobTitle: 'Frontend Lead',
      departmentLabels: [deptEngineering.id],
      status: 'ACTIVE',
    },
  })

  const member4 = await prisma.member.create({
    data: {
      organizationId: org1.id,
      userId: user6.id, // Alex Thompson
      role: 'MEMBER',
      jobTitle: 'DevOps Engineer',
      departmentLabels: [deptEngineering.id],
      status: 'ACTIVE',
    },
  })

  const member5 = await prisma.member.create({
    data: {
      organizationId: org1.id,
      userId: user7.id, // Priya Patel
      role: 'MEMBER',
      jobTitle: 'QA Lead',
      departmentLabels: [deptEngineering.id],
      status: 'ACTIVE',
    },
  })

  const member6 = await prisma.member.create({
    data: {
      organizationId: org1.id,
      userId: user8.id, // James Wilson
      role: 'MEMBER',
      jobTitle: 'Product Manager',
      departmentLabels: [deptProduct.id],
      status: 'ACTIVE',
    },
  })

  const member7 = await prisma.member.create({
    data: {
      organizationId: org1.id,
      userId: user9.id, // Sophia Nguyen
      role: 'MEMBER',
      jobTitle: 'Product Designer',
      departmentLabels: [deptProduct.id],
      status: 'ACTIVE',
    },
  })

  const member8 = await prisma.member.create({
    data: {
      organizationId: org1.id,
      userId: user10.id, // Marcus Brown
      role: 'MEMBER',
      jobTitle: 'UX Researcher',
      departmentLabels: [deptProduct.id],
      status: 'ACTIVE',
    },
  })

  const member9 = await prisma.member.create({
    data: {
      organizationId: org1.id,
      userId: user11.id, // Olivia Garcia
      role: 'MEMBER',
      jobTitle: 'Operations Manager',
      departmentLabels: [deptOperations.id],
      status: 'ACTIVE',
    },
  })

  const member10 = await prisma.member.create({
    data: {
      organizationId: org1.id,
      userId: user12.id, // Ethan Lee
      role: 'MEMBER',
      jobTitle: 'Project Coordinator',
      departmentLabels: [deptOperations.id],
      status: 'ACTIVE',
    },
  })

  const techMembers = [
    member1,
    member2,
    member3,
    member4,
    member5,
    member6,
    member7,
    member8,
    member9,
    member10,
  ]

  console.log(`✅ Created ${techMembers.length} members for TechCorp\n`)

  // Create members for Organization 2 (Design Studio)
  console.log('👥 Creating members for Design Studio...')
  const designMember1 = await prisma.member.create({
    data: {
      userId: user2.id,
      organizationId: org2.id,
      role: 'ADMIN',
      jobTitle: 'Creative Director',
      departmentLabels: [],
      status: 'ACTIVE',
    },
  })

  const designMember2 = await prisma.member.create({
    data: {
      organizationId: org2.id,
      userId: user13.id, // Emily Johnson
      role: 'MEMBER',
      jobTitle: 'Senior Designer',
      departmentLabels: [],
      status: 'ACTIVE',
    },
  })

  const designMembers = [designMember1, designMember2]

  console.log(`✅ Created ${designMembers.length} members for Design Studio\n`)

  // Create members for Organization 3 (Consulting)
  console.log('👥 Creating members for Consulting Partners...')
  const consultMember1 = await prisma.member.create({
    data: {
      userId: user3.id,
      organizationId: org3.id,
      role: 'ADMIN',
      jobTitle: 'Managing Partner',
      departmentLabels: [],
      status: 'ACTIVE',
    },
  })

  const consultMembers = [consultMember1]

  console.log(`✅ Created ${consultMembers.length} members for Consulting Partners\n`)

  // Create projects
  console.log('📁 Creating projects...')
  const techProject1 = await prisma.project.create({
    data: {
      organizationId: org1.id,
      name: 'Mobile App Redesign',
      description: 'Complete redesign of iOS and Android mobile applications with new features',
      ownerId: member1.id, // Sarah Chen (VP of Engineering)
    },
  })

  const techProject2 = await prisma.project.create({
    data: {
      organizationId: org1.id,
      name: 'API Migration to v2',
      description: 'Migrate all backend services to new API architecture',
      ownerId: member1.id, // Sarah Chen (VP of Engineering)
    },
  })

  console.log('✅ Created 2 projects\n')

  // Create matrices with tasks and assignments
  console.log('📊 Creating RACI matrices...')

  // Matrix 1: Mobile App Redesign
  const matrix1 = await prisma.matrix.create({
    data: {
      projectId: techProject1.id,
      name: 'Q1 Mobile App Sprint',
      description: 'RACI assignments for mobile app redesign sprint',
      version: 1,
    },
  })

  // Create tasks for Matrix 1
  const task1 = await prisma.task.create({
    data: {
      matrixId: matrix1.id,
      name: 'User Research & Analysis',
      description: 'Conduct user interviews and analyze existing app usage patterns',
      orderIndex: 0,
    },
  })

  const task2 = await prisma.task.create({
    data: {
      matrixId: matrix1.id,
      name: 'Wireframe Design',
      description: 'Create low-fidelity wireframes for key screens',
      orderIndex: 1,
    },
  })

  const task3 = await prisma.task.create({
    data: {
      matrixId: matrix1.id,
      name: 'High-Fidelity Mockups',
      description: 'Design final visual mockups with brand guidelines',
      orderIndex: 2,
    },
  })

  const task4 = await prisma.task.create({
    data: {
      matrixId: matrix1.id,
      name: 'Frontend Development',
      description: 'Implement UI components and screens',
      orderIndex: 3,
    },
  })

  const task5 = await prisma.task.create({
    data: {
      matrixId: matrix1.id,
      name: 'Backend API Integration',
      description: 'Connect frontend to backend services',
      orderIndex: 4,
    },
  })

  const task6 = await prisma.task.create({
    data: {
      matrixId: matrix1.id,
      name: 'QA Testing',
      description: 'Comprehensive testing across devices and OS versions',
      orderIndex: 5,
    },
  })

  const task7 = await prisma.task.create({
    data: {
      matrixId: matrix1.id,
      name: 'Production Deployment',
      description: 'Deploy to app stores with phased rollout',
      orderIndex: 6,
    },
  })

  // Create RACI assignments for Matrix 1
  // Task 1: User Research (UX Researcher = A/R, Product Designer = C)
  await prisma.assignment.create({
    data: {
      matrixId: matrix1.id,
      taskId: task1.id,
      memberId: member8.id, // UX Researcher
      raciRole: "ACCOUNTABLE",
      assignedBy: user1.id,
    },
  })
  await prisma.assignment.create({
    data: {
      matrixId: matrix1.id,
      taskId: task1.id,
      memberId: member8.id,
      raciRole: "RESPONSIBLE",
      assignedBy: user1.id,
    },
  })
  await prisma.assignment.create({
    data: {
      matrixId: matrix1.id,
      taskId: task1.id,
      memberId: member7.id, // Product Designer
      raciRole: "CONSULTED",
      assignedBy: user1.id,
    },
  })

  // Task 2: Wireframes (Product Designer = A/R, UX Researcher = C)
  await prisma.assignment.create({
    data: {
      matrixId: matrix1.id,
      taskId: task2.id,
      memberId: member7.id,
      raciRole: "ACCOUNTABLE",
      assignedBy: user1.id,
    },
  })
  await prisma.assignment.create({
    data: {
      matrixId: matrix1.id,
      taskId: task2.id,
      memberId: member7.id,
      raciRole: "RESPONSIBLE",
      assignedBy: user1.id,
    },
  })
  await prisma.assignment.create({
    data: {
      matrixId: matrix1.id,
      taskId: task2.id,
      memberId: member8.id,
      raciRole: "CONSULTED",
      assignedBy: user1.id,
    },
  })

  // Task 3: Hi-Fi Mockups (Product Designer = A/R, VP = C)
  await prisma.assignment.create({
    data: {
      matrixId: matrix1.id,
      taskId: task3.id,
      memberId: member7.id,
      raciRole: "ACCOUNTABLE",
      assignedBy: user1.id,
    },
  })
  await prisma.assignment.create({
    data: {
      matrixId: matrix1.id,
      taskId: task3.id,
      memberId: member7.id,
      raciRole: "RESPONSIBLE",
      assignedBy: user1.id,
    },
  })
  await prisma.assignment.create({
    data: {
      matrixId: matrix1.id,
      taskId: task3.id,
      memberId: member1.id, // VP
      raciRole: "CONSULTED",
      assignedBy: user1.id,
    },
  })

  // Task 4: Frontend Dev (Frontend Lead = A/R, Backend = R)
  await prisma.assignment.create({
    data: {
      matrixId: matrix1.id,
      taskId: task4.id,
      memberId: member3.id, // Frontend Lead
      raciRole: "ACCOUNTABLE",
      assignedBy: user1.id,
    },
  })
  await prisma.assignment.create({
    data: {
      matrixId: matrix1.id,
      taskId: task4.id,
      memberId: member3.id,
      raciRole: "RESPONSIBLE",
      assignedBy: user1.id,
    },
  })
  await prisma.assignment.create({
    data: {
      matrixId: matrix1.id,
      taskId: task4.id,
      memberId: member2.id, // Backend Engineer
      raciRole: "RESPONSIBLE",
      assignedBy: user1.id,
    },
  })

  // Task 5: Backend Integration (Backend = A/R, Frontend = C)
  await prisma.assignment.create({
    data: {
      matrixId: matrix1.id,
      taskId: task5.id,
      memberId: member2.id,
      raciRole: "ACCOUNTABLE",
      assignedBy: user1.id,
    },
  })
  await prisma.assignment.create({
    data: {
      matrixId: matrix1.id,
      taskId: task5.id,
      memberId: member2.id,
      raciRole: "RESPONSIBLE",
      assignedBy: user1.id,
    },
  })
  await prisma.assignment.create({
    data: {
      matrixId: matrix1.id,
      taskId: task5.id,
      memberId: member3.id,
      raciRole: "CONSULTED",
      assignedBy: user1.id,
    },
  })

  // Task 6: QA Testing (QA Lead = A/R, Frontend = C)
  await prisma.assignment.create({
    data: {
      matrixId: matrix1.id,
      taskId: task6.id,
      memberId: member5.id, // QA Lead
      raciRole: "ACCOUNTABLE",
      assignedBy: user1.id,
    },
  })
  await prisma.assignment.create({
    data: {
      matrixId: matrix1.id,
      taskId: task6.id,
      memberId: member5.id,
      raciRole: "RESPONSIBLE",
      assignedBy: user1.id,
    },
  })
  await prisma.assignment.create({
    data: {
      matrixId: matrix1.id,
      taskId: task6.id,
      memberId: member3.id,
      raciRole: "CONSULTED",
      assignedBy: user1.id,
    },
  })

  // Task 7: Deployment (DevOps = A/R, VP = C)
  await prisma.assignment.create({
    data: {
      matrixId: matrix1.id,
      taskId: task7.id,
      memberId: member4.id, // DevOps
      raciRole: "ACCOUNTABLE",
      assignedBy: user1.id,
    },
  })
  await prisma.assignment.create({
    data: {
      matrixId: matrix1.id,
      taskId: task7.id,
      memberId: member4.id,
      raciRole: "RESPONSIBLE",
      assignedBy: user1.id,
    },
  })
  await prisma.assignment.create({
    data: {
      matrixId: matrix1.id,
      taskId: task7.id,
      memberId: member1.id,
      raciRole: "CONSULTED",
      assignedBy: user1.id,
    },
  })

  console.log(`✅ Created Matrix 1: "${matrix1.name}" with 7 tasks and assignments`)

  // Matrix 2: API Migration
  const matrix2 = await prisma.matrix.create({
    data: {
      projectId: techProject2.id,
      name: 'API v2 Migration Tasks',
      description: 'Backend migration responsibilities',
      version: 1,
    },
  })

  const task8 = await prisma.task.create({
    data: {
      matrixId: matrix2.id,
      name: 'API Design & Documentation',
      orderIndex: 0,
    },
  })

  await prisma.assignment.create({
    data: {
      matrixId: matrix2.id,
      taskId: task8.id,
      memberId: member2.id, // Backend Engineer
      raciRole: "ACCOUNTABLE",
      assignedBy: user1.id,
    },
  })
  await prisma.assignment.create({
    data: {
      matrixId: matrix2.id,
      taskId: task8.id,
      memberId: member2.id,
      raciRole: "RESPONSIBLE",
      assignedBy: user1.id,
    },
  })

  console.log(`✅ Created Matrix 2: "${matrix2.name}" with tasks and assignments`)

  console.log('\n✨ Seed completed successfully!\n')
  console.log('📊 Summary:')
  console.log(`   - 3 Organizations`)
  console.log(`   - 4 Users (password: Demo123!)`)
  console.log(`   - ${techMembers.length + designMembers.length + consultMembers.length} Members`)
  console.log(`   - 2 Projects`)
  console.log(`   - 2 Matrices with 8 total tasks`)
  console.log(`   - Multiple RACI assignments\n`)
  console.log('🔑 Demo Login Credentials:')
  console.log('   Super Admin: admin@racisaas.com / Demo123!')
  console.log('   TechCorp:    sarah.chen@techcorp.com / Demo123!')
  console.log('   Design:      michael.rodriguez@designstudio.com / Demo123!')
  console.log('   Consulting:  emma.wilson@consulting.com / Demo123!\n')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
