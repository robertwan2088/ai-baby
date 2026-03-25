# AI 宝贝数据库表结构设计

## 表 1: users (用户表)
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone VARCHAR(11) UNIQUE NOT NULL,
    nickname VARCHAR(50),
    avatar VARCHAR(255),
    baby_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 表 2: babies (宝贝信息表)
```sql
CREATE TABLE babies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(50) NOT NULL,
    gender VARCHAR(10),
    birthday DATE,
    avatar VARCHAR(255),
    favorite VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## 表 3: games (游戏表)
```sql
CREATE TABLE games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(100) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    description TEXT,
    category VARCHAR(20),
    age_range VARCHAR(20),
    download_count INTEGER DEFAULT 0,
    rating REAL DEFAULT 4.5,
    thumbnail VARCHAR(255),
    content TEXT,
    is_featured INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 表 4: qa (问答表)
```sql
CREATE TABLE qa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(50),
    tags VARCHAR(200),
    view_count INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 表 5: recommendations (推荐表)
```sql
CREATE TABLE recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50),
    thumbnail VARCHAR(255),
    link VARCHAR(255),
    order_num INTEGER DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 表 6: admin_users (管理员表)
```sql
CREATE TABLE admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 表 7: verifications (验证码表)
```sql
CREATE TABLE verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone VARCHAR(11) NOT NULL,
    code VARCHAR(6) NOT NULL,
    type VARCHAR(20) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 表 8: logs (操作日志)
```sql
CREATE TABLE logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action VARCHAR(50) NOT NULL,
    details TEXT,
    ip_address VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 索引
```sql
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_babies_user_id ON babies(user_id);
CREATE INDEX idx_games_category ON games(category);
CREATE INDEX idx_qa_category ON qa(category);
CREATE INDEX idx_recommendations_category ON recommendations(category);
CREATE INDEX idx_verifications_phone ON verifications(phone);
```

## 初始化数据
```sql
-- 默认管理员
INSERT INTO admin_users (username, password_hash) 
VALUES ('admin', '$2b$10$YourHashedPasswordHere');

-- 示例游戏
INSERT INTO games (title, icon, description, category, age_range, rating, thumbnail, is_featured) VALUES
    ('幼儿拼图', '🧩', '拼图游戏，锻炼动手能力', '益智', '2-4岁', 4.8, 'https://example.com/thumb.jpg', 1),
    ('颜色认知', '🎨', '认识颜色和形状', '启蒙', '2-3岁', 4.5, 'https://example.com/thumb.jpg', 1),
    ('数字游戏', '🔢', '认识数字，简单加减', '数学', '3-5岁', 4.7, 'https://example.com/thumb.jpg', 0);

-- 示例问答
INSERT INTO qa (question, answer, category, tags) VALUES
    ('宝宝不爱吃饭怎么办？', '建议：1.不要强迫 2.让孩子参与 3.固定用餐时间 4.做好榜样', '喂养', '挑食,吃饭', '实用'),
    ('宝宝多大可以上幼儿园？', '3-4岁是比较合适的入园年龄。可以从半天托班开始，逐渐适应。', '教育', '入园,幼儿园', '建议');
```
