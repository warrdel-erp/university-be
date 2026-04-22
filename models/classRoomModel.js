import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import floor from "./floorModel.js";

export default sequelize.define(
    'class_room_section',
    {
        classRoomSectionId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'class_room_section_id'
        },
        floorId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'floor_id',
            references: {
                model: floor,
                key: 'floor_id'
            }
        },
        roomNumber: {
            type: DataTypes.STRING,
            field: 'room_number',
            allowNull: false,
        },
        capacity: {
            type: DataTypes.INTEGER,
            field: 'capacity',
            allowNull: false
        },
        examCapacity: {
            type: DataTypes.INTEGER,
            field: 'exam_capacity',
            allowNull: true
        },
        examCapacityColumns: {
            type: DataTypes.INTEGER,
            field: 'exam_capacity_columns',
            allowNull: true
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'created_by',
            references: {
                model: users,
                key: 'user_id'
            }
        },
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'updated_by',
            references: {
                model: users,
                key: 'user_id'
            }
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'created_at'
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'updated_at'
        },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deleted_at'
        }
    },
    {
        tableName: 'class_room_section',
        timestamps: true,
        paranoid: true
    }
);