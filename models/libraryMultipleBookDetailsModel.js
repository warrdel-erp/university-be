import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import libraryAddItemModel from "./libraryAddItemModel.js";

export default sequelize.define(
    'library_multiple_book_details',
    {
        libraryMultipleBookDetails: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'library_multiple_book_detail_id'
        },
        libraryAddItemId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'library_add_item_id',
            references: {
                model: libraryAddItemModel,
                key: 'library_add_item_id'
            }
        },
        startingAccessionNumber:{
            type: DataTypes.STRING,
            allowNull: true,
            field: 'starting_accession_number',
        },
        quantityOfBook:{
            type: DataTypes.STRING,
            allowNull: true,
            field: 'quantity_of_book',
        },
        prefix:{
            type: DataTypes.STRING,
            allowNull: true,
        },
        suffix:{
            type: DataTypes.STRING,
            allowNull: true,
        },
        startingIsbnNumber:{
            type: DataTypes.STRING,
            allowNull: true,
            field: 'starting_isbn_number',
        },
        isbnPrefix:{
            type: DataTypes.STRING,
            allowNull: true,
            field:'isbn_prefix'
        },
        isbnSuffix:{
            type: DataTypes.STRING,
            allowNull: true,
            field: 'isbn_suffix',
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
        tableName: 'library_multiple_book_details',
        timestamps: true,
        paranoid: true
    }
);