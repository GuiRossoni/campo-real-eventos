-- Schema oficial para o banco de dados MySQL - Campo Real Eventos

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  ra VARCHAR(50) NULL,
  course VARCHAR(150) NULL,
  period VARCHAR(50) NULL,
  institution VARCHAR(255) NULL,
  role VARCHAR(50) NOT NULL,
  password VARCHAR(255) NULL
);

CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  banner LONGTEXT NOT NULL,
  location VARCHAR(255) NOT NULL,
  startDate VARCHAR(50) NOT NULL,
  endDate VARCHAR(50) NOT NULL,
  startTime VARCHAR(20) NOT NULL,
  endTime VARCHAR(20) NOT NULL,
  category VARCHAR(100) NOT NULL,
  maxParticipants INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  creatorId VARCHAR(100) NOT NULL,
  creatorName VARCHAR(255) NOT NULL,
  isFeatured BOOLEAN NOT NULL DEFAULT 0,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS workshops (
  id VARCHAR(100) PRIMARY KEY,
  eventId VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  instructor VARCHAR(255) NOT NULL,
  date VARCHAR(50) NOT NULL,
  time VARCHAR(20) NOT NULL,
  maxParticipants INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  enrolledCount INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS enrollments (
  id VARCHAR(100) PRIMARY KEY,
  userId VARCHAR(100) NOT NULL,
  userEmail VARCHAR(150) NOT NULL,
  userName VARCHAR(255) NOT NULL,
  userRa VARCHAR(50) NULL,
  eventId VARCHAR(100) NOT NULL,
  eventName VARCHAR(255) NOT NULL,
  selectedWorkshops TEXT NOT NULL,
  totalValue DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  status VARCHAR(50) NOT NULL,
  createdAt VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS attendance (
  id VARCHAR(100) PRIMARY KEY,
  userId VARCHAR(100) NOT NULL,
  userName VARCHAR(255) NOT NULL,
  userEmail VARCHAR(150) NOT NULL,
  userRa VARCHAR(50) NULL,
  eventId VARCHAR(100) NOT NULL,
  workshopId VARCHAR(100) NULL,
  checkedInAt VARCHAR(50) NOT NULL,
  checkedInBy VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS certificates (
  id VARCHAR(100) PRIMARY KEY,
  userId VARCHAR(100) NOT NULL,
  userName VARCHAR(255) NOT NULL,
  userRa VARCHAR(50) NULL,
  eventId VARCHAR(100) NOT NULL,
  eventName VARCHAR(255) NOT NULL,
  hours INT NOT NULL,
  hash VARCHAR(100) NOT NULL,
  issuedAt VARCHAR(50) NOT NULL,
  coordinationSignature VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS system_logs (
  id VARCHAR(100) PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  userEmail VARCHAR(150) NOT NULL,
  userRole VARCHAR(50) NOT NULL,
  details TEXT NOT NULL,
  timestamp VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS home_banners (
  id VARCHAR(100) PRIMARY KEY,
  imageUrl LONGTEXT NOT NULL,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255) NOT NULL,
  linkToEventId VARCHAR(100) NULL,
  isActive BOOLEAN NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS financial_expenses (
  id VARCHAR(100) PRIMARY KEY,
  eventId VARCHAR(100) NOT NULL,
  eventName VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  value DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  type VARCHAR(50) NOT NULL,
  date VARCHAR(50) NOT NULL,
  createdAt VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS vouchers (
  id VARCHAR(100) PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL,
  prefix VARCHAR(100) NOT NULL,
  discountType VARCHAR(50) NOT NULL,
  discountPercent DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  applicableEventIds TEXT NOT NULL,
  maxUses INT NOT NULL DEFAULT 1,
  usedCount INT NOT NULL DEFAULT 0,
  isActive BOOLEAN NOT NULL DEFAULT 1,
  createdAt VARCHAR(50) NOT NULL,
  createdBy VARCHAR(100) NOT NULL,
  creatorName VARCHAR(255) NOT NULL,
  description TEXT NULL,
  usages LONGTEXT NULL
);

CREATE TABLE IF NOT EXISTS system_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value LONGTEXT NOT NULL,
  updated_at VARCHAR(50) NOT NULL
);

-- Inserção do Usuário Root Inicial
INSERT INTO users (id, name, email, role, course, period, password)
VALUES (
  'user_root_softweek',
  'Super Administrador Root',
  'softweek@aeg.dev.br',
  'ROOT',
  'Engenharia de Software',
  'Superuser',
  '$2b$10$bSCD39yPImsb9HEvYatUEu76klfRMzjk7NT8eUbEaRu4MjbLBHv4e'
)
ON DUPLICATE KEY UPDATE
  role = 'ROOT',
  password = '$2b$10$bSCD39yPImsb9HEvYatUEu76klfRMzjk7NT8eUbEaRu4MjbLBHv4e';
