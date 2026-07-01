export interface Endpoint {
  id: string;
  group: string;
  subgroup: string;
  name: string;
  method: string;
  url: string;
  body: string;
  description: string;
  queryParams: { key: string; value: string; description: string }[];
}

export const endpoints: Endpoint[] = [
  {
    "group": "Entities",
    "subgroup": "Categories",
    "name": "Get all categories",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Category",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_0"
  },
  {
    "group": "Entities",
    "subgroup": "Categories",
    "name": "CountCategories",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Category/count",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_1"
  },
  {
    "group": "Entities",
    "subgroup": "Categories",
    "name": "Get category by id",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Category/1",
    "body": "",
    "description": "Return the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        |",
    "queryParams": [],
    "id": "ep_2"
  },
  {
    "group": "Entities",
    "subgroup": "Categories",
    "name": "Create category",
    "method": "POST",
    "url": "{{baseURL}}/api/entities/Category",
    "body": "{\n  \"name\": \"test\"\n}",
    "description": "Create a new category with the following attributes\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit           | int       |    |\n| itemCode              | string",
    "queryParams": [],
    "id": "ep_3"
  },
  {
    "group": "Entities",
    "subgroup": "Categories",
    "name": "Update category",
    "method": "PUT",
    "url": "{{baseURL}}/api/entities/Category/100",
    "body": "{\n  \"id\": 100,\n  \"comment\": \"test\"\n}",
    "description": "Update the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit      ",
    "queryParams": [],
    "id": "ep_4"
  },
  {
    "group": "Entities",
    "subgroup": "Categories",
    "name": "Delete category",
    "method": "DELETE",
    "url": "{{baseURL}}/api/entities/Category/21",
    "body": "",
    "description": "Delete the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}",
    "queryParams": [],
    "id": "ep_5"
  },
  {
    "group": "Entities",
    "subgroup": "Clients",
    "name": "Get all client",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Client",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_6"
  },
  {
    "group": "Entities",
    "subgroup": "Clients",
    "name": "CountClient",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Client/count",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_7"
  },
  {
    "group": "Entities",
    "subgroup": "Clients",
    "name": "Get client by id",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Client/1",
    "body": "",
    "description": "Return the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        |",
    "queryParams": [],
    "id": "ep_8"
  },
  {
    "group": "Entities",
    "subgroup": "Clients",
    "name": "Create client",
    "method": "POST",
    "url": "{{baseURL}}/api/entities/Client",
    "body": "{\n  \"name\": \"test\"\n}",
    "description": "Create a new category with the following attributes\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit           | int       |    |\n| itemCode              | string",
    "queryParams": [],
    "id": "ep_9"
  },
  {
    "group": "Entities",
    "subgroup": "Clients",
    "name": "Update client",
    "method": "PUT",
    "url": "{{baseURL}}/api/entities/Client/42",
    "body": "{\n  \"id\": 100,\n  \"comment\": \"test\"\n}",
    "description": "Update the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit      ",
    "queryParams": [],
    "id": "ep_10"
  },
  {
    "group": "Entities",
    "subgroup": "Clients",
    "name": "Delete client",
    "method": "DELETE",
    "url": "{{baseURL}}/api/entities/Client/21",
    "body": "",
    "description": "Delete the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}",
    "queryParams": [],
    "id": "ep_11"
  },
  {
    "group": "Entities",
    "subgroup": "Container",
    "name": "Get all Container",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Container",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_12"
  },
  {
    "group": "Entities",
    "subgroup": "Container",
    "name": "CountContainer",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Container/count",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_13"
  },
  {
    "group": "Entities",
    "subgroup": "Container",
    "name": "Get Container by id",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Container/1",
    "body": "",
    "description": "Return the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        |",
    "queryParams": [],
    "id": "ep_14"
  },
  {
    "group": "Entities",
    "subgroup": "Container",
    "name": "Create Container",
    "method": "POST",
    "url": "{{baseURL}}/api/entities/Container",
    "body": "{\n    \"id\" : 1,\n    \"name\": \"test\"\n}",
    "description": "Create a new category with the following attributes\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit           | int       |    |\n| itemCode              | string",
    "queryParams": [],
    "id": "ep_15"
  },
  {
    "group": "Entities",
    "subgroup": "Container",
    "name": "Update Container",
    "method": "PUT",
    "url": "{{baseURL}}/api/entities/Container/1",
    "body": "{\n  \"id\": 100,\n  \"comment\": \"test\"\n}",
    "description": "Update the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit      ",
    "queryParams": [],
    "id": "ep_16"
  },
  {
    "group": "Entities",
    "subgroup": "Container",
    "name": "Delete Container",
    "method": "DELETE",
    "url": "{{baseURL}}/api/entities/Container/1",
    "body": "",
    "description": "Delete the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}",
    "queryParams": [],
    "id": "ep_17"
  },
  {
    "group": "Entities",
    "subgroup": "Department",
    "name": "Get all Department",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Department",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_18"
  },
  {
    "group": "Entities",
    "subgroup": "Department",
    "name": "Count Department",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Department/count",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_19"
  },
  {
    "group": "Entities",
    "subgroup": "Department",
    "name": "Get Department by id",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Department/1",
    "body": "",
    "description": "Return the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        |",
    "queryParams": [],
    "id": "ep_20"
  },
  {
    "group": "Entities",
    "subgroup": "Department",
    "name": "Create Department",
    "method": "POST",
    "url": "{{baseURL}}/api/entities/Department",
    "body": "{\n    \"id\" : 1,\n    \"name\": \"test\"\n}",
    "description": "Create a new category with the following attributes\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit           | int       |    |\n| itemCode              | string",
    "queryParams": [],
    "id": "ep_21"
  },
  {
    "group": "Entities",
    "subgroup": "Department",
    "name": "Update Department",
    "method": "PUT",
    "url": "{{baseURL}}/api/entities/Department/1",
    "body": "{\n  \"id\": 100,\n  \"comment\": \"test\"\n}",
    "description": "Update the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit      ",
    "queryParams": [],
    "id": "ep_22"
  },
  {
    "group": "Entities",
    "subgroup": "Department",
    "name": "Delete Department",
    "method": "DELETE",
    "url": "{{baseURL}}/api/entities/Department/1",
    "body": "",
    "description": "Delete the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}",
    "queryParams": [],
    "id": "ep_23"
  },
  {
    "group": "Entities",
    "subgroup": "Device",
    "name": "Get all Device",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Device",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_24"
  },
  {
    "group": "Entities",
    "subgroup": "Device",
    "name": "Get Device byServerId",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Device/byServerId/1",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_25"
  },
  {
    "group": "Entities",
    "subgroup": "Device",
    "name": "Count Device",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Device/count",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_26"
  },
  {
    "group": "Entities",
    "subgroup": "Device",
    "name": "Get Device by id",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Device/1",
    "body": "",
    "description": "Return the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        |",
    "queryParams": [],
    "id": "ep_27"
  },
  {
    "group": "Entities",
    "subgroup": "Device",
    "name": "Create Device",
    "method": "POST",
    "url": "{{baseURL}}/api/entities/Device",
    "body": "{\n    \"name\": \"test\"\n}",
    "description": "Create a new category with the following attributes\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit           | int       |    |\n| itemCode              | string",
    "queryParams": [],
    "id": "ep_28"
  },
  {
    "group": "Entities",
    "subgroup": "Device",
    "name": "Update Device",
    "method": "PUT",
    "url": "{{baseURL}}/api/entities/Device/1",
    "body": "{\n  \"id\": 100,\n  \"comment\": \"test\"\n}",
    "description": "Update the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit      ",
    "queryParams": [],
    "id": "ep_29"
  },
  {
    "group": "Entities",
    "subgroup": "Device",
    "name": "Delete Device",
    "method": "DELETE",
    "url": "{{baseURL}}/api/entities/Device/1",
    "body": "",
    "description": "Delete the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}",
    "queryParams": [],
    "id": "ep_30"
  },
  {
    "group": "Entities",
    "subgroup": "GPITrigger",
    "name": "Get all GPITrigger",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/GPITrigger",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_31"
  },
  {
    "group": "Entities",
    "subgroup": "GPITrigger",
    "name": "Count GPITrigger",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/GPITrigger/count",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_32"
  },
  {
    "group": "Entities",
    "subgroup": "GPITrigger",
    "name": "Get GPITrigger by id",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/GPITrigger/1",
    "body": "",
    "description": "Return the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        |",
    "queryParams": [],
    "id": "ep_33"
  },
  {
    "group": "Entities",
    "subgroup": "GPITrigger",
    "name": "Create GPITrigger",
    "method": "POST",
    "url": "{{baseURL}}/api/entities/GPITrigger",
    "body": "{\n    \"id\" : 1,\n    \"name\": \"test\"\n}",
    "description": "Create a new category with the following attributes\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit           | int       |    |\n| itemCode              | string",
    "queryParams": [],
    "id": "ep_34"
  },
  {
    "group": "Entities",
    "subgroup": "GPITrigger",
    "name": "Update GPITrigger",
    "method": "PUT",
    "url": "{{baseURL}}/api/entities/GPITrigger/1",
    "body": "{\n  \"id\": 100,\n  \"comment\": \"test\"\n}",
    "description": "Update the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit      ",
    "queryParams": [],
    "id": "ep_35"
  },
  {
    "group": "Entities",
    "subgroup": "GPITrigger",
    "name": "Delete GPITrigger",
    "method": "DELETE",
    "url": "{{baseURL}}/api/entities/GPITrigger/1",
    "body": "",
    "description": "Delete the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}",
    "queryParams": [],
    "id": "ep_36"
  },
  {
    "group": "Entities",
    "subgroup": "Holder",
    "name": "Get all Holder",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Holder",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_37"
  },
  {
    "group": "Entities",
    "subgroup": "Holder",
    "name": "Count Holder",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Holder/count",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_38"
  },
  {
    "group": "Entities",
    "subgroup": "Holder",
    "name": "Get Holder by id",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Holder/1",
    "body": "",
    "description": "Return the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        |",
    "queryParams": [],
    "id": "ep_39"
  },
  {
    "group": "Entities",
    "subgroup": "Holder",
    "name": "Create Holder",
    "method": "POST",
    "url": "{{baseURL}}/api/entities/Holder",
    "body": "{\n    \"id\" : 1,\n    \"name\": \"test\"\n}",
    "description": "Create a new category with the following attributes\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit           | int       |    |\n| itemCode              | string",
    "queryParams": [],
    "id": "ep_40"
  },
  {
    "group": "Entities",
    "subgroup": "Holder",
    "name": "Update Holder",
    "method": "PUT",
    "url": "{{baseURL}}/api/entities/Holder/1",
    "body": "{\n  \"id\": 100,\n  \"comment\": \"test\"\n}",
    "description": "Update the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit      ",
    "queryParams": [],
    "id": "ep_41"
  },
  {
    "group": "Entities",
    "subgroup": "Holder",
    "name": "Delete Holder",
    "method": "DELETE",
    "url": "{{baseURL}}/api/entities/Holder/1",
    "body": "",
    "description": "Delete the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}",
    "queryParams": [],
    "id": "ep_42"
  },
  {
    "group": "Entities",
    "subgroup": "ItemAttribute",
    "name": "Get all ItemAttribute",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/ItemAttribute",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_43"
  },
  {
    "group": "Entities",
    "subgroup": "ItemAttribute",
    "name": "Count ItemAttribute",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/ItemAttribute/count",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_44"
  },
  {
    "group": "Entities",
    "subgroup": "ItemAttribute",
    "name": "Get ItemAttribute by id",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/ItemAttribute/1",
    "body": "",
    "description": "Return the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        |",
    "queryParams": [],
    "id": "ep_45"
  },
  {
    "group": "Entities",
    "subgroup": "ItemAttribute",
    "name": "Create ItemAttribute",
    "method": "POST",
    "url": "{{baseURL}}/api/entities/ItemAttribute",
    "body": "{\n    \"name\": \"test\"\n}",
    "description": "Create a new category with the following attributes\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit           | int       |    |\n| itemCode              | string",
    "queryParams": [],
    "id": "ep_46"
  },
  {
    "group": "Entities",
    "subgroup": "ItemAttribute",
    "name": "Update ItemAttribute",
    "method": "PUT",
    "url": "{{baseURL}}/api/entities/ItemAttribute/1",
    "body": "{\n  \"id\": 100,\n  \"comment\": \"test\"\n}",
    "description": "Update the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit      ",
    "queryParams": [],
    "id": "ep_47"
  },
  {
    "group": "Entities",
    "subgroup": "ItemAttribute",
    "name": "Delete ItemAttribute",
    "method": "DELETE",
    "url": "{{baseURL}}/api/entities/ItemAttribute/1",
    "body": "",
    "description": "Delete the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}",
    "queryParams": [],
    "id": "ep_48"
  },
  {
    "group": "Entities",
    "subgroup": "Items",
    "name": "Get all items",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Item",
    "body": "",
    "description": "Return all items\n\n| Column                          | Type                              | Nullable |\n| ------------------------------- | :-------------------------------- | :------: |\n| @class                          | string                            |   |\n| id                              | string                            |   |\n| encodingDate                    | date                        ",
    "queryParams": [],
    "id": "ep_49"
  },
  {
    "group": "Entities",
    "subgroup": "Items",
    "name": "Get all items (chunked)",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Item/chunked",
    "body": "",
    "description": "Return all items\n\n| Column                          | Type                              | Nullable |\n| ------------------------------- | :-------------------------------- | :------: |\n| @class                          | string                            |   |\n| id                              | string                            |   |\n| encodingDate                    | date                        ",
    "queryParams": [],
    "id": "ep_50"
  },
  {
    "group": "Entities",
    "subgroup": "Items",
    "name": "Get item by id",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Item/300ED89F335000800028E07A",
    "body": "",
    "description": "Return the item with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Item/{id}\n\n| Column                          | Type                              | Nullable |\n| ------------------------------- | :-------------------------------- | :------: |\n| @class                          | string                            |   |\n| id                              | string               ",
    "queryParams": [],
    "id": "ep_51"
  },
  {
    "group": "Entities",
    "subgroup": "Items",
    "name": "Create item",
    "method": "POST",
    "url": "{{baseURL}}/api/entities/Item",
    "body": "{\n  \"@class\": \"net.ubisolutions.ubimanager.entities.laundry.ItemLaundry\",\n  \"id\": \"azerty2\",\n  \"category\": {\n    \"id\": 1\n  }\n}",
    "description": "Create a new item with the following attributes",
    "queryParams": [],
    "id": "ep_52"
  },
  {
    "group": "Entities",
    "subgroup": "Items",
    "name": "Update item",
    "method": "PUT",
    "url": "{{baseURL}}/api/entities/Item/azerty2",
    "body": "{\n  \"@class\": \"net.ubisolutions.ubimanager.entities.laundry.ItemLaundry\",\n  \"id\": \"azerty2\",\n  \"comment\": \"test\"\n    \"tid\" : \"E23456\"\n\n}",
    "description": "Update the item with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Item/{id}",
    "queryParams": [],
    "id": "ep_53"
  },
  {
    "group": "Entities",
    "subgroup": "Items",
    "name": "Delete item",
    "method": "DELETE",
    "url": "{{baseURL}}/api/entities/Item/azerty2",
    "body": "",
    "description": "Delete the item with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Item/{id}",
    "queryParams": [],
    "id": "ep_54"
  },
  {
    "group": "Entities",
    "subgroup": "ItemType",
    "name": "Get all ItemType",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/ItemType",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_55"
  },
  {
    "group": "Entities",
    "subgroup": "ItemType",
    "name": "Count ItemType",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/ItemType/count",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_56"
  },
  {
    "group": "Entities",
    "subgroup": "ItemType",
    "name": "Get ItemType by id",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/ItemType/1",
    "body": "",
    "description": "Return the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        |",
    "queryParams": [],
    "id": "ep_57"
  },
  {
    "group": "Entities",
    "subgroup": "ItemType",
    "name": "Create ItemType",
    "method": "POST",
    "url": "{{baseURL}}/api/entities/ItemType",
    "body": "{\n    \"name\": \"test\"\n}",
    "description": "Create a new category with the following attributes\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit           | int       |    |\n| itemCode              | string",
    "queryParams": [],
    "id": "ep_58"
  },
  {
    "group": "Entities",
    "subgroup": "ItemType",
    "name": "Update ItemType",
    "method": "PUT",
    "url": "{{baseURL}}/api/entities/ItemType/1",
    "body": "{\n  \"id\": 100,\n  \"comment\": \"test\"\n}",
    "description": "Update the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit      ",
    "queryParams": [],
    "id": "ep_59"
  },
  {
    "group": "Entities",
    "subgroup": "ItemType",
    "name": "Delete ItemType",
    "method": "DELETE",
    "url": "{{baseURL}}/api/entities/ItemType/1",
    "body": "",
    "description": "Delete the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}",
    "queryParams": [],
    "id": "ep_60"
  },
  {
    "group": "Entities",
    "subgroup": "LinkAttributeItem",
    "name": "Get all LinkAttributeItem",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/LinkAttributeItem",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_61"
  },
  {
    "group": "Entities",
    "subgroup": "LinkAttributeItem",
    "name": "Count LinkAttributeItem",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/LinkAttributeItem/count",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_62"
  },
  {
    "group": "Entities",
    "subgroup": "LinkAttributeItem",
    "name": "Get LinkAttributeItem by id",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/LinkAttributeItem/1",
    "body": "",
    "description": "Return the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        |",
    "queryParams": [],
    "id": "ep_63"
  },
  {
    "group": "Entities",
    "subgroup": "LinkAttributeItem",
    "name": "Create LinkAttributeItem",
    "method": "POST",
    "url": "{{baseURL}}/api/entities/LinkAttributeItem",
    "body": "{\n    \"name\": \"test\"\n}",
    "description": "Create a new category with the following attributes\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit           | int       |    |\n| itemCode              | string",
    "queryParams": [],
    "id": "ep_64"
  },
  {
    "group": "Entities",
    "subgroup": "LinkAttributeItem",
    "name": "Update LinkAttributeItem",
    "method": "PUT",
    "url": "{{baseURL}}/api/entities/LinkAttributeItem/1",
    "body": "{\n  \"id\": 100,\n  \"comment\": \"test\"\n}",
    "description": "Update the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit      ",
    "queryParams": [],
    "id": "ep_65"
  },
  {
    "group": "Entities",
    "subgroup": "LinkAttributeItem",
    "name": "Delete LinkAttributeItem",
    "method": "DELETE",
    "url": "{{baseURL}}/api/entities/LinkAttributeItem/1",
    "body": "",
    "description": "Delete the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}",
    "queryParams": [],
    "id": "ep_66"
  },
  {
    "group": "Entities",
    "subgroup": "Location",
    "name": "Get all Location",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Location",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_67"
  },
  {
    "group": "Entities",
    "subgroup": "Location",
    "name": "Count Location",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Location/count",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_68"
  },
  {
    "group": "Entities",
    "subgroup": "Location",
    "name": "Get Location by id",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Location/1",
    "body": "",
    "description": "Return the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        |",
    "queryParams": [],
    "id": "ep_69"
  },
  {
    "group": "Entities",
    "subgroup": "Location",
    "name": "Create Location",
    "method": "POST",
    "url": "{{baseURL}}/api/entities/Location",
    "body": "{\n    \"name\": \"test\"\n}",
    "description": "Create a new category with the following attributes\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit           | int       |    |\n| itemCode              | string",
    "queryParams": [],
    "id": "ep_70"
  },
  {
    "group": "Entities",
    "subgroup": "Location",
    "name": "Update Location",
    "method": "PUT",
    "url": "{{baseURL}}/api/entities/Location/1",
    "body": "{\n  \"comment\": \"test\"\n}",
    "description": "Update the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit      ",
    "queryParams": [],
    "id": "ep_71"
  },
  {
    "group": "Entities",
    "subgroup": "Location",
    "name": "Delete Location",
    "method": "DELETE",
    "url": "{{baseURL}}/api/entities/Location/1",
    "body": "",
    "description": "Delete the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}",
    "queryParams": [],
    "id": "ep_72"
  },
  {
    "group": "Entities",
    "subgroup": "LocationType",
    "name": "Get all LocationType",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/LocationType",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_73"
  },
  {
    "group": "Entities",
    "subgroup": "LocationType",
    "name": "Count LocationType",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/LocationType/count",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_74"
  },
  {
    "group": "Entities",
    "subgroup": "LocationType",
    "name": "Get LocationTypeby id",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/LocationType/1",
    "body": "",
    "description": "Return the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        |",
    "queryParams": [],
    "id": "ep_75"
  },
  {
    "group": "Entities",
    "subgroup": "LocationType",
    "name": "Create LocationType",
    "method": "POST",
    "url": "{{baseURL}}/api/entities/LocationType",
    "body": "{\n    \"name\": \"test\"\n}",
    "description": "Create a new category with the following attributes\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit           | int       |    |\n| itemCode              | string",
    "queryParams": [],
    "id": "ep_76"
  },
  {
    "group": "Entities",
    "subgroup": "LocationType",
    "name": "Update LocationType",
    "method": "PUT",
    "url": "{{baseURL}}/api/entities/LocationType/1",
    "body": "{\n  \"comment\": \"test\"\n}",
    "description": "Update the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit      ",
    "queryParams": [],
    "id": "ep_77"
  },
  {
    "group": "Entities",
    "subgroup": "LocationType",
    "name": "Delete LocationType",
    "method": "DELETE",
    "url": "{{baseURL}}/api/entities/LocationType/1",
    "body": "",
    "description": "Delete the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}",
    "queryParams": [],
    "id": "ep_78"
  },
  {
    "group": "Entities",
    "subgroup": "MovementType",
    "name": "Get all MovementType",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/MovementType",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_79"
  },
  {
    "group": "Entities",
    "subgroup": "MovementType",
    "name": "Count MovementType",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/MovementType/count",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_80"
  },
  {
    "group": "Entities",
    "subgroup": "MovementType",
    "name": "Get MovementType id",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/MovementType/1",
    "body": "",
    "description": "Return the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        |",
    "queryParams": [],
    "id": "ep_81"
  },
  {
    "group": "Entities",
    "subgroup": "MovementType",
    "name": "Create MovementType",
    "method": "POST",
    "url": "{{baseURL}}/api/entities/MovementType",
    "body": "{\n    \"name\": \"test\"\n}",
    "description": "Create a new category with the following attributes\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit           | int       |    |\n| itemCode              | string",
    "queryParams": [],
    "id": "ep_82"
  },
  {
    "group": "Entities",
    "subgroup": "MovementType",
    "name": "Update MovementType",
    "method": "PUT",
    "url": "{{baseURL}}/api/entities/MovementType/1",
    "body": "{\n  \"comment\": \"test\"\n}",
    "description": "Update the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit      ",
    "queryParams": [],
    "id": "ep_83"
  },
  {
    "group": "Entities",
    "subgroup": "MovementType",
    "name": "Delete MovementType",
    "method": "DELETE",
    "url": "{{baseURL}}/api/entities/MovementType/1",
    "body": "",
    "description": "Delete the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}",
    "queryParams": [],
    "id": "ep_84"
  },
  {
    "group": "Entities",
    "subgroup": "Server",
    "name": "Get all Server",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Server",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_85"
  },
  {
    "group": "Entities",
    "subgroup": "Server",
    "name": "Count Server",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Server/count",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_86"
  },
  {
    "group": "Entities",
    "subgroup": "Server",
    "name": "Get Server id",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Server/1",
    "body": "",
    "description": "Return the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        |",
    "queryParams": [],
    "id": "ep_87"
  },
  {
    "group": "Entities",
    "subgroup": "Server",
    "name": "Create Server",
    "method": "POST",
    "url": "{{baseURL}}/api/entities/Server",
    "body": "{\n    \"name\": \"test\"\n}",
    "description": "Create a new category with the following attributes\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit           | int       |    |\n| itemCode              | string",
    "queryParams": [],
    "id": "ep_88"
  },
  {
    "group": "Entities",
    "subgroup": "Server",
    "name": "Update Server",
    "method": "PUT",
    "url": "{{baseURL}}/api/entities/Server/1",
    "body": "{\n  \"comment\": \"test\"\n}",
    "description": "Update the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit      ",
    "queryParams": [],
    "id": "ep_89"
  },
  {
    "group": "Entities",
    "subgroup": "Server",
    "name": "Delete Server",
    "method": "DELETE",
    "url": "{{baseURL}}/api/entities/Server/1",
    "body": "",
    "description": "Delete the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}",
    "queryParams": [],
    "id": "ep_90"
  },
  {
    "group": "Entities",
    "subgroup": "StartTriggerAutoConfig",
    "name": "Get all StartTriggerAutoConfig",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/StartTriggerAutoConfig",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_91"
  },
  {
    "group": "Entities",
    "subgroup": "StartTriggerAutoConfig",
    "name": "Count StartTriggerAutoConfig",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/StartTriggerAutoConfig/count",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_92"
  },
  {
    "group": "Entities",
    "subgroup": "StartTriggerAutoConfig",
    "name": "Get StartTriggerAutoConfigid",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/StartTriggerAutoConfig/1",
    "body": "",
    "description": "Return the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        |",
    "queryParams": [],
    "id": "ep_93"
  },
  {
    "group": "Entities",
    "subgroup": "StartTriggerAutoConfig",
    "name": "Create StartTriggerAutoConfig",
    "method": "POST",
    "url": "{{baseURL}}/api/entities/StartTriggerAutoConfig",
    "body": "{\n    \"name\": \"test\"\n}",
    "description": "Create a new category with the following attributes\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit           | int       |    |\n| itemCode              | string",
    "queryParams": [],
    "id": "ep_94"
  },
  {
    "group": "Entities",
    "subgroup": "StartTriggerAutoConfig",
    "name": "Update StartTriggerAutoConfig",
    "method": "PUT",
    "url": "{{baseURL}}/api/entities/StartTriggerAutoConfig/1",
    "body": "{\n  \"comment\": \"test\"\n}",
    "description": "Update the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit      ",
    "queryParams": [],
    "id": "ep_95"
  },
  {
    "group": "Entities",
    "subgroup": "StartTriggerAutoConfig",
    "name": "Delete StartTriggerAutoConfig",
    "method": "DELETE",
    "url": "{{baseURL}}/api/entities/StartTriggerAutoConfig/1",
    "body": "",
    "description": "Delete the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}",
    "queryParams": [],
    "id": "ep_96"
  },
  {
    "group": "Entities",
    "subgroup": "StopTriggerAutoConfig",
    "name": "Get all StopTriggerAutoConfig",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/StopTriggerAutoConfig",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_97"
  },
  {
    "group": "Entities",
    "subgroup": "StopTriggerAutoConfig",
    "name": "Count StopTriggerAutoConfig",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/StopTriggerAutoConfig/count",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_98"
  },
  {
    "group": "Entities",
    "subgroup": "StopTriggerAutoConfig",
    "name": "Get StopTriggerAutoConfigid",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/StopTriggerAutoConfig/1",
    "body": "",
    "description": "Return the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        |",
    "queryParams": [],
    "id": "ep_99"
  },
  {
    "group": "Entities",
    "subgroup": "StopTriggerAutoConfig",
    "name": "Create StopTriggerAutoConfig",
    "method": "POST",
    "url": "{{baseURL}}/api/entities/StopTriggerAutoConfig",
    "body": "{\n    \"name\": \"test\"\n}",
    "description": "Create a new category with the following attributes\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit           | int       |    |\n| itemCode              | string",
    "queryParams": [],
    "id": "ep_100"
  },
  {
    "group": "Entities",
    "subgroup": "StopTriggerAutoConfig",
    "name": "Update StopTriggerAutoConfig",
    "method": "PUT",
    "url": "{{baseURL}}/api/entities/StopTriggerAutoConfig/1",
    "body": "{\n  \"comment\": \"test\"\n}",
    "description": "Update the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit      ",
    "queryParams": [],
    "id": "ep_101"
  },
  {
    "group": "Entities",
    "subgroup": "StopTriggerAutoConfig",
    "name": "Delete StopTriggerAutoConfig",
    "method": "DELETE",
    "url": "{{baseURL}}/api/entities/StopTriggerAutoConfig/1",
    "body": "",
    "description": "Delete the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}",
    "queryParams": [],
    "id": "ep_102"
  },
  {
    "group": "Entities",
    "subgroup": "SwitchBox",
    "name": "Get all SwitchBox",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/SwitchBox",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_103"
  },
  {
    "group": "Entities",
    "subgroup": "SwitchBox",
    "name": "Count SwitchBox",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/SwitchBox/count",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_104"
  },
  {
    "group": "Entities",
    "subgroup": "SwitchBox",
    "name": "Get SwitchBox",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/SwitchBox/1",
    "body": "",
    "description": "Return the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        |",
    "queryParams": [],
    "id": "ep_105"
  },
  {
    "group": "Entities",
    "subgroup": "SwitchBox",
    "name": "Create SwitchBox",
    "method": "POST",
    "url": "{{baseURL}}/api/entities/SwitchBox",
    "body": "{\n    \"name\": \"test\"\n}",
    "description": "Create a new category with the following attributes\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit           | int       |    |\n| itemCode              | string",
    "queryParams": [],
    "id": "ep_106"
  },
  {
    "group": "Entities",
    "subgroup": "SwitchBox",
    "name": "Update SwitchBox",
    "method": "PUT",
    "url": "{{baseURL}}/api/entities/SwitchBox/1",
    "body": "{\n  \"comment\": \"test\"\n}",
    "description": "Update the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit      ",
    "queryParams": [],
    "id": "ep_107"
  },
  {
    "group": "Entities",
    "subgroup": "SwitchBox",
    "name": "Delete SwitchBox",
    "method": "DELETE",
    "url": "{{baseURL}}/api/entities/SwitchBox/1",
    "body": "",
    "description": "Delete the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}",
    "queryParams": [],
    "id": "ep_108"
  },
  {
    "group": "Entities",
    "subgroup": "Workstation",
    "name": "Get all Workstation",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Workstation",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_109"
  },
  {
    "group": "Entities",
    "subgroup": "Workstation",
    "name": "Count Workstation",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Workstation/count",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_110"
  },
  {
    "group": "Entities",
    "subgroup": "Workstation",
    "name": "Get Workstation",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/Workstation/1",
    "body": "",
    "description": "Return the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        |",
    "queryParams": [],
    "id": "ep_111"
  },
  {
    "group": "Entities",
    "subgroup": "Workstation",
    "name": "Create Workstation",
    "method": "POST",
    "url": "{{baseURL}}/api/entities/Workstation",
    "body": "{\n    \"name\": \"test\",\n    \"workstationType\": {\n        \"id\": 1,\n        \"name\": \"Assignation\",\n        \"comment\": null\n    }\n}",
    "description": "Create a new category with the following attributes\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit           | int       |    |\n| itemCode              | string",
    "queryParams": [],
    "id": "ep_112"
  },
  {
    "group": "Entities",
    "subgroup": "Workstation",
    "name": "Update Workstation",
    "method": "PUT",
    "url": "{{baseURL}}/api/entities/Workstation/1",
    "body": "{\n  \"comment\": \"test\"\n}",
    "description": "Update the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit      ",
    "queryParams": [],
    "id": "ep_113"
  },
  {
    "group": "Entities",
    "subgroup": "Workstation",
    "name": "Delete Workstation",
    "method": "DELETE",
    "url": "{{baseURL}}/api/entities/Workstation/1",
    "body": "",
    "description": "Delete the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}",
    "queryParams": [],
    "id": "ep_114"
  },
  {
    "group": "Entities",
    "subgroup": "WorkstationType",
    "name": "Get all WorkstationType",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/WorkstationType",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_115"
  },
  {
    "group": "Entities",
    "subgroup": "WorkstationType",
    "name": "Count WorkstationType",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/WorkstationType/count",
    "body": "",
    "description": "Return all categories\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        | @Category |   |\n| packingUnit           | int       |   |\n| itemCode              | s",
    "queryParams": [],
    "id": "ep_116"
  },
  {
    "group": "Entities",
    "subgroup": "WorkstationType",
    "name": "Get WorkstationType",
    "method": "GET",
    "url": "{{baseURL}}/api/entities/WorkstationType/1",
    "body": "",
    "description": "Return the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Nullable |\n| --------------------- | :-------- | :------: |\n| id                    | long      |   |\n| name                  | string    |   |\n| comment               | string    |   |\n| categoryLevel         | int       |   |\n| parentCategory        |",
    "queryParams": [],
    "id": "ep_117"
  },
  {
    "group": "Entities",
    "subgroup": "WorkstationType",
    "name": "Create WorkstationType",
    "method": "POST",
    "url": "{{baseURL}}/api/entities/WorkstationType",
    "body": "{\n    \"name\": \"test\",\n    \"workstationType\": {\n        \"id\": 1,\n        \"name\": \"Assignation\",\n        \"comment\": null\n    }\n}",
    "description": "Create a new category with the following attributes\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit           | int       |    |\n| itemCode              | string",
    "queryParams": [],
    "id": "ep_118"
  },
  {
    "group": "Entities",
    "subgroup": "WorkstationType",
    "name": "Update WorkstationType",
    "method": "PUT",
    "url": "{{baseURL}}/api/entities/WorkstationType/1",
    "body": "{\n  \"comment\": \"test\"\n}",
    "description": "Update the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}\n\n| Column                | Type      | Mandatory |\n| --------------------- | :-------- | :-------: |\n| name                  | string    |    |\n| comment               | string    |    |\n| categoryLevel         | int       |    |\n| parentCategory        | @Category |    |\n| packingUnit      ",
    "queryParams": [],
    "id": "ep_119"
  },
  {
    "group": "Entities",
    "subgroup": "WorkstationType",
    "name": "Delete WorkstationType",
    "method": "DELETE",
    "url": "{{baseURL}}/api/entities/WorkstationType/1",
    "body": "",
    "description": "Delete the category with the specified id\n\nhttps://ubilaundry.fr.ubi-manager.com/api/entities/Category/{id}",
    "queryParams": [],
    "id": "ep_120"
  },
  {
    "group": "Laundry",
    "subgroup": "Assignment",
    "name": "Assignment",
    "method": "POST",
    "url": "{{baseURL}}/api/assignment",
    "body": "{\n  \"item\": {\n    \"@class\": \"net.ubisolutions.ubimanager.entities.laundry.ItemLaundry\",\n    \"id\": \"azerty\",\n    \"encodingDate\": \"2022-10-11T17:02:50.197+02:00\",\n    \"firstSeenDate\": null,\n    \"lastSeenDate\": null,\n    \"batchnumber\" : 12344,\n    \"category\": {\n      \"id\": 1\n    },\n    \"lastSeenLocation\": {\n      \"id\": 1\n    },\n    \"attributeLinks\": [],\n    \"vcn\": null\n  },\n  \"reassign\": true,\n  \"returnValue\": true\n}",
    "description": "",
    "queryParams": [],
    "id": "ep_121"
  },
  {
    "group": "Laundry",
    "subgroup": "Reports",
    "name": "Create report",
    "method": "POST",
    "url": "{{baseURL}}/api/createReport",
    "body": "{\n    \"tagId\": \"STP048163\",\n    \"date\": \"2025-12-20T17:03:02.37+02:00\",\n    \"movementType\": 1,\n    \"workstation\": 187,\n    \"reportLocation\": 152,\n    \"comment\": \"57508\",\n    \"reportStatus\": \"RAW_REPORT\"\n  }",
    "description": "",
    "queryParams": [],
    "id": "ep_122"
  },
  {
    "group": "Laundry",
    "subgroup": "Reports",
    "name": "Create reports",
    "method": "POST",
    "url": "{{baseURL}}/api/createReports",
    "body": "[\n  {\n    \"tagId\": \"300D669D2B003240641F0030\",\n    \"date\": \"2025-12-14T17:03:02.37+02:00\",\n    \"movementType\": 12,\n    \"workstation\": 1,\n    \"comment\": \"\",\n    \"reportStatus\": \"RAW_REPORT\",\n    \"tid\" : \"E123456798\",\n    \"vcn\" : \"TEST\"\n  }\n]",
    "description": "",
    "queryParams": [],
    "id": "ep_123"
  },
  {
    "group": "Laundry",
    "subgroup": "Named queries",
    "name": "namedQuery",
    "method": "GET",
    "url": "{{baseURL}}/api/findWithNamedQuery/Category.all",
    "body": "",
    "description": "",
    "queryParams": [],
    "id": "ep_124"
  },
  {
    "group": "Laundry",
    "subgroup": "Named queries",
    "name": "namedQuery / limit",
    "method": "GET",
    "url": "{{baseURL}}/api/findWithNamedQuery/Category.all",
    "body": "",
    "description": "",
    "queryParams": [],
    "id": "ep_125"
  },
  {
    "group": "Laundry",
    "subgroup": "Named queries",
    "name": "namedQuery",
    "method": "POST",
    "url": "{{baseURL}}/api/findWithNamedQuery/Category.byrfid",
    "body": "{\r\n  \"params\": [\r\n    {\r\n      \"name\": \"rfid\",\r\n      \"value\": true\r\n    }\r\n  ]\r\n}",
    "description": "",
    "queryParams": [],
    "id": "ep_126"
  },
  {
    "group": "Laundry",
    "subgroup": "Named queries",
    "name": "namedQuery/limit",
    "method": "POST",
    "url": "{{baseURL}}/api/findWithNamedQuery/Category.byrfid",
    "body": "{\r\n  \"params\": [\r\n    {\r\n      \"name\": \"rfid\",\r\n      \"value\": true\r\n    }\r\n  ]\r\n}",
    "description": "",
    "queryParams": [],
    "id": "ep_127"
  },
  {
    "group": "Laundry",
    "subgroup": "GetBLNumber",
    "name": "GetBLNumber",
    "method": "GET",
    "url": "{{baseURL}}/api/laundry/GetBLNumber",
    "body": "",
    "description": "",
    "queryParams": [],
    "id": "ep_128"
  },
  {
    "group": "Laundry",
    "subgroup": "GetDeliveryOrderItems",
    "name": "GetDeliveryOrderItems",
    "method": "GET",
    "url": "{{baseURL}}/api/laundry/GetDeliveryOrderItems?deliveryorderid=1312",
    "body": "",
    "description": "",
    "queryParams": [
      {
        "key": "deliveryorderid",
        "value": "1312",
        "description": ""
      }
    ],
    "id": "ep_129"
  },
  {
    "group": "Laundry",
    "subgroup": "GetDeliveryOrderItemsByLastMovement",
    "name": "GetDeliveryOrderItemsByLastMovement",
    "method": "GET",
    "url": "{{baseURL}}/api/laundry/GetDeliveryOrderItemsByLastMovement?clientids=101&clientids=102&movementId=5",
    "body": "",
    "description": "",
    "queryParams": [
      {
        "key": "clientids",
        "value": "101",
        "description": ""
      },
      {
        "key": "clientids",
        "value": "102",
        "description": ""
      },
      {
        "key": "movementId",
        "value": "5",
        "description": ""
      }
    ],
    "id": "ep_130"
  },
  {
    "group": "Laundry",
    "subgroup": "GetDeliveryOrderVcn",
    "name": "GetDeliveryOrderVcn",
    "method": "GET",
    "url": "{{baseURL}}/api/laundry/GetDeliveryOrderVcn?clientid=1",
    "body": "",
    "description": "",
    "queryParams": [
      {
        "key": "clientid",
        "value": "1",
        "description": ""
      }
    ],
    "id": "ep_131"
  },
  {
    "group": "Laundry",
    "subgroup": "GetDeliveryOrderVcns",
    "name": "GetDeliveryOrderVcns",
    "method": "GET",
    "url": "{{baseURL}}/api/laundry/GetDeliveryOrderVcns?clientids=101&clientids=102&clientids=105",
    "body": "",
    "description": "",
    "queryParams": [
      {
        "key": "clientids",
        "value": "101",
        "description": ""
      },
      {
        "key": "clientids",
        "value": "102",
        "description": ""
      },
      {
        "key": "clientids",
        "value": "105",
        "description": ""
      }
    ],
    "id": "ep_132"
  },
  {
    "group": "Laundry",
    "subgroup": "getItemDetailsCustomerRejected",
    "name": "getItemDetailsCustomerRejected",
    "method": "GET",
    "url": "{{baseURL}}/api/laundry/getItemDetailsCustomerRejected?itemId=ABC12345&movementTypeId=10&limit=50&customerRejectedMovementTypeId=15",
    "body": "",
    "description": "",
    "queryParams": [
      {
        "key": "itemId",
        "value": "ABC12345",
        "description": ""
      },
      {
        "key": "movementTypeId",
        "value": "10",
        "description": ""
      },
      {
        "key": "limit",
        "value": "50",
        "description": ""
      },
      {
        "key": "customerRejectedMovementTypeId",
        "value": "15",
        "description": ""
      }
    ],
    "id": "ep_133"
  },
  {
    "group": "Laundry",
    "subgroup": "getItemWashCount",
    "name": "getItemWashCount",
    "method": "GET",
    "url": "{{baseURL}}/api/laundry/getItemWashCount/itemId=1312",
    "body": "",
    "description": "",
    "queryParams": [],
    "id": "ep_134"
  },
  {
    "group": "Laundry",
    "subgroup": "GetDepartementLocation",
    "name": "GetDepartementLocation",
    "method": "GET",
    "url": "{{baseURL}}/api/laundry/GetDepartementLocation?departementid=1",
    "body": "",
    "description": "",
    "queryParams": [
      {
        "key": "departementid",
        "value": "1",
        "description": ""
      }
    ],
    "id": "ep_135"
  },
  {
    "group": "Laundry",
    "subgroup": "GetClientLocation",
    "name": "GetClientLocation",
    "method": "GET",
    "url": "{{baseURL}}/api/laundry/GetClientLocation?clientid=1",
    "body": "",
    "description": "",
    "queryParams": [
      {
        "key": "clientid",
        "value": "1",
        "description": ""
      }
    ],
    "id": "ep_136"
  },
  {
    "group": "Laundry",
    "subgroup": "GetRound",
    "name": "GetRound",
    "method": "GET",
    "url": "{{baseURL}}/api/laundry/GetRound?roundId=1",
    "body": "",
    "description": "",
    "queryParams": [
      {
        "key": "roundId",
        "value": "1",
        "description": ""
      }
    ],
    "id": "ep_137"
  },
  {
    "group": "Laundry",
    "subgroup": "Server",
    "name": "getServerTime",
    "method": "GET",
    "url": "{{baseURL}}/api/getServerTime",
    "body": "",
    "description": "",
    "queryParams": [],
    "id": "ep_138"
  },
  {
    "group": "Laundry",
    "subgroup": "Short lookups",
    "name": "getShortCategory",
    "method": "GET",
    "url": "{{baseURL}}/api/getShortCategory/300ED89F335000800028E081",
    "body": "",
    "description": "",
    "queryParams": [],
    "id": "ep_139"
  },
  {
    "group": "Laundry",
    "subgroup": "Short lookups",
    "name": "getShortItem",
    "method": "GET",
    "url": "{{baseURL}}/api/getShortItem/300ED89F335000800028E081",
    "body": "",
    "description": "",
    "queryParams": [],
    "id": "ep_140"
  }
];
