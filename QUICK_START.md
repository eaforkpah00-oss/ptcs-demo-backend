# PTCS Test Credentials - Quick Reference Card

## 🚀 How to Generate Test Data

```bash
# In backend folder
node seeds/seedTestData.js
```

---

## 🔐 LOGIN CREDENTIALS

### Admin Dashboard
```
📧 Email: admin@testschool.edu
🔑 Password: AdminPass123
```

### Teacher Dashboard
```
📧 Email: teacher@testschool.edu
🔑 Password: TeacherPass123
```

### Parent Portal
```
📧 Email: parent@testschool.edu
🔑 Password: ParentPass123
```

---

## 👨‍🎓 Student Access (Parent Portal)

| Student | ID | Password (DOB) | Class |
|---------|----|----|-------|
| John Doe | 1001 | 2008-05-15 | Grade 10-A |
| Jane Smith | 1002 | 2008-03-20 | Grade 10-A |
| Michael Johnson | 1003 | 2008-07-10 | Grade 10-B |

---

## 📋 What Gets Created

✅ 1 School (Test School PTCS)  
✅ 3 Users (Admin, Teacher, Parent)  
✅ 3 Students  
✅ 2 Classes  
✅ All relationships linked  

---

## ⚙️ Prerequisites

- MongoDB running locally (or Atlas URI in .env)
- Backend dependencies installed (`npm install`)
- Backend server running (`npm run dev`)

---

## 🎯 Test Flows

1. **Admin Role**: Manage users, view reports, school settings
2. **Teacher Role**: Mark attendance, enter grades, communicate
3. **Parent Role**: View child progress, messages from teachers
4. **Student Access**: Parent logs in with Student ID + DOB

---

**Location:** `/TEST_CREDENTIALS.md` in project root
