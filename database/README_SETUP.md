# การสร้าง Database ผ่าน DB Browser for SQLite

## 🗃️ วิธีการสร้าง Database

### **ขั้นตอนที่ 1: สร้าง Database File**
1. เปิด **DB Browser for SQLite**
2. คลิก **"New Database"**
3. ตั้งชื่อไฟล์: `school_schedule.db`
4. เลือกที่เก็บ: `F:\Project\Web\Table_Teach_Studen_System\database\`
5. คลิก **Save**

### **ขั้นตอนที่ 2: รัน SQL Script**
1. ในหน้า DB Browser คลิกแท็บ **"Execute SQL"**
2. เปิดไฟล์ `init_database.sql` ด้วย Text Editor (Notepad++)
3. **Copy ทั้งหมด** จากไฟล์ SQL
4. **Paste** ลงในช่อง SQL ของ DB Browser
5. คลิก **Execute All** (หรือกด F5)

### **ขั้นตอนที่ 3: ตรวจสอบผลลัพธ์**
หลังรัน SQL สำเร็จ ควรเห็น:

**ในแท็บ "Database Structure":**
- ✅ admin_users
- ✅ admin_sessions  
- ✅ admin_activity_log
- ✅ academic_years
- ✅ semesters
- ✅ periods

**ตรวจสอบข้อมูล:**
1. คลิกแท็บ **"Browse Data"**
2. เลือกตาราง **admin_users** → ควรมี admin user 1 คน
3. เลือกตาราง **academic_years** → ควรมี 3 ปี (2566, 2567, 2568)
4. เลือกตาราง **periods** → ควรมี 8 คาบเวลา

### **ขั้นตอนที่ 4: Save Database**
1. กด **Ctrl+S** หรือคลิก **File > Write Changes**
2. คลิก **Save** เพื่อบันทึกการเปลี่ยนแปลง

## ✅ **เสร็จสิ้น!**

Database พร้อมใช้งานแล้ว ตำแหน่ง:
```
F:\Project\Web\Table_Teach_Studen_System\database\school_schedule.db
```

## 🔑 **Default Admin Login**
```
Username: admin
Password: admin123 (ต้องเปลี่ยนทันที!)
Role: super_admin
```

## 🛠️ **Tips การใช้ DB Browser**
- **Browse Data**: ดูข้อมูลในตาราง
- **Execute SQL**: รัน SQL commands
- **Database Structure**: ดูโครงสร้างตาราง
- **Export**: ส่งออกข้อมูลเป็น CSV/SQL

## ⚠️ **หมายเหตุ**
- แต่ละครั้งที่แก้ไขต้อง **Save** (Ctrl+S)
- สามารถเปิดไฟล์ .db ซ้ำได้เสมอ
- ใช้แท็บ Execute SQL สำหรับรัน queries
