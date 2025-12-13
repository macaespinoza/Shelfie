// Modelo de Usuario
const { DataTypes } = require('sequelize')
const bcrypt = require('bcryptjs')
const { sequelize } = require('../config/database')

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: {
      msg: 'Este nombre de usuario ya esta en uso'
    },
    validate: {
      notEmpty: {
        msg: 'El nombre de usuario es requerido'
      },
      len: {
        args: [3, 30],
        msg: 'El nombre de usuario debe tener entre 3 y 30 caracteres'
      },
      // Solo permitir letras, numeros y guiones bajos
      is: {
        args: /^[a-zA-Z0-9_]+$/,
        msg: 'El nombre de usuario solo puede contener letras, numeros y guiones bajos'
      }
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: {
      msg: 'Este email ya esta registrado'
    },
    validate: {
      notEmpty: {
        msg: 'El email es requerido'
      },
      isEmail: {
        msg: 'Debe ser un email valido'
      }
    }
  },
  password: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'La contrasena es requerida'
      },
      len: {
        args: [6, 100],
        msg: 'La contrasena debe tener al menos 6 caracteres'
      }
    }
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: {
        args: [0, 500],
        msg: 'La biografia no puede exceder 500 caracteres'
      }
    }
  },
  avatar: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: null
  },
  coverImage: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: null,
    field: 'cover_image'
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    // Encriptar contrasena antes de crear usuario
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10)
        user.password = await bcrypt.hash(user.password, salt)
      }
    },
    // Encriptar contrasena antes de actualizar si fue modificada
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10)
        user.password = await bcrypt.hash(user.password, salt)
      }
    }
  }
})

// Metodo de instancia para verificar contrasena
User.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password)
}

// Metodo de instancia para obtener datos publicos (sin contrasena)
User.prototype.toPublicJSON = function() {
  return {
    id: this.id,
    username: this.username,
    email: this.email,
    bio: this.bio,
    avatar: this.avatar,
    coverImage: this.coverImage,
    createdAt: this.created_at
  }
}

// Metodo para obtener la URL del avatar
User.prototype.getAvatarUrl = function() {
  if (this.avatar) {
    return `/uploads/avatars/${this.avatar}`
  }
  // Avatar por defecto usando iniciales
  return null
}

// Metodo para obtener la URL de la portada
User.prototype.getCoverUrl = function() {
  if (this.coverImage) {
    return `/uploads/covers/${this.coverImage}`
  }
  return null
}

module.exports = User
