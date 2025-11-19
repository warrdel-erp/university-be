import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import users from "./userModel.js";
import libraryCreationModel from "./libraryCreationModel.js";

export default sequelize.define(
    "library_book",
    {
        libraryBookId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: "library_book_id"
        },
        libraryCreationId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: "library_creation_id",
            references: {
                model: libraryCreationModel,
                key: "library_creation_id"
            }
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        subtitle: {
            type: DataTypes.STRING,
            allowNull: true
        },
        authors: {
            type: DataTypes.STRING,
            allowNull: true
        },
        publisher: {
            type: DataTypes.STRING,
            allowNull: true
        },
        placeOfPublication: {
            type: DataTypes.STRING,
            allowNull: true,
            field: "place_of_publication"
        },
        yearOfPublication: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: "year_of_publication"
        },
        edition: {
            type: DataTypes.STRING,
            allowNull: true
        },
        seriesTitle: {
            type: DataTypes.STRING,
            allowNull: true,
            field: "series_title"
        },
        volumeNumber: {
            type: DataTypes.STRING,
            allowNull: true,
            field: "volume_number"
        },
        language: {
            type: DataTypes.STRING,
            allowNull: true
        },
        isbn: {
            type: DataTypes.STRING,
            allowNull: true
        },
        issn: {
            type: DataTypes.STRING,
            allowNull: true
        },
        physicalDescription: {
            type: DataTypes.STRING,
            allowNull: true,
            field: "physical_description"
        },
        numberOfPages: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: "number_of_pages"
        },
        illustrations: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        summary: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        keywords: {
            type: DataTypes.TEXT,   
            allowNull: true
        },
        additionalAuthor: {
            type: DataTypes.TEXT,
            allowNull: true,
            field:'additional_author'
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "created_by",
            references: {
                model: users,
                key: "user_id"
            }
        },
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "updated_by",
            references: {
                model: users,
                key: "user_id"
            }
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
            field: "created_at"
        },
        updatedAt: {
            type: DataTypes.DATE,
            defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
            field: "updated_at"
        },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: "deleted_at"
        }
    },
    {
        tableName: "library_book",
        timestamps: true,
        paranoid: true
    }
);