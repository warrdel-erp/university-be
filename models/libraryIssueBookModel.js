import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import libraryAddItem from "./libraryAddItemModel.js";
import libraryMember from "./libraryMemberModel.js";

export default sequelize.define(
    'library_issue_book',
    {
        libraryIssueBookId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'library_issue_book_id'
        },
        libraryAddItemId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'library_add_item_id',
            references: {
                model: libraryAddItem,
                key: 'library_add_item_id'
            }
        },
        libraryMemberId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'library_member_id',
            references: {
                model: libraryMember,
                key: 'library_member_id'
            }
        },
        issueDate: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'issue_date',
        },
        returnDate:{
            type: DataTypes.DATE,
            allowNull: true,
            field: 'return_date',
        },
        status:{
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue:'Issue'
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
        tableName: 'library_issue_book',
        timestamps: true,
        paranoid: true
    }
);