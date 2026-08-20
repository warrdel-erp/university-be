import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import examRoomMaterialBundleModel from "./examRoomMaterialBundleModel.js";
import userModel from "./userModel.js";

const examRoomMaterialItemModel = sequelize.define(
    "exam_room_material_item",
    {
        examRoomMaterialItemId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: "exam_room_material_item_id",
        },
        examRoomMaterialBundleId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: examRoomMaterialBundleModel,
                key: "exam_room_material_bundle_id",
            },
            field: "exam_room_material_bundle_id",
        },
        itemType: {
            type: DataTypes.ENUM("ANSWER_SHEET", "EXTRA_SHEET", "GRAPH_SHEET", "ROUGH_SHEET", "ATTENDANCE_SHEET", "ROOM_KIT"),
            allowNull: false,
            field: "item_type",
        },
        plannedQuantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: "planned_quantity",
        },
        issuedQuantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: "issued_quantity",
        },
        usedQuantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: "used_quantity",
        },
        unusedQuantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: "unused_quantity",
        },
        returnedQuantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: "returned_quantity",
        },
        damagedQuantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: "damaged_quantity",
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: "remarks",
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: userModel,
                key: "user_id",
            },
            field: "created_by",
        },
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: userModel,
                key: "user_id",
            },
            field: "updated_by",
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
            field: "created_at",
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
            field: "updated_at",
        },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deleted_at'
        },
    },
    {
        tableName: "exam_room_material_item",
        timestamps: true,
        paranoid: true,
        indexes: [
            {
                unique: true,
                fields: ["exam_room_material_bundle_id", "item_type"],
            },
        ],
    }
);

examRoomMaterialItemModel.scopeConfig = { university: false, institute: false, academicYear: false };

export default examRoomMaterialItemModel;
