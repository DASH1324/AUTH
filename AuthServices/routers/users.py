from fastapi import APIRouter, HTTPException, Depends, status, Form, UploadFile, File
import shutil, os
from routers.auth import oauth2_scheme
from datetime import datetime
from database import get_db_connection 
from routers.auth import get_current_active_user, role_required 
import bcrypt
from typing import Optional
from pydantic import BaseModel
import logging

# config logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

router = APIRouter()

# models
class PinVerificationRequest(BaseModel):
    pin: str

class ManagerPinVerifyResponse(BaseModel):
    managerUsername: str

# upload photo oos
@router.post("/profile/upload-photo")
async def upload_profile_photo(file: UploadFile = File(...), current_user=Depends(get_current_active_user)):
    upload_dir = "uploads/profile_pictures"
    os.makedirs(upload_dir, exist_ok=True)
    file_location = os.path.join(upload_dir, file.filename)
    try:
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to upload file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to upload file")
    # Update user's profileImage in database
    conn = None
    cursor = None
    try:
        conn = await get_db_connection()
        cursor = await conn.cursor()
        # Use current_user.username to get UserID from DB
        await cursor.execute("SELECT UserID FROM Users WHERE Username = ?", (current_user.username,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        user_id = row[0]
        await cursor.execute("UPDATE Users SET profileImage = ? WHERE UserID = ?", (file.filename, user_id))
        await conn.commit()
    except Exception as e:
        logger.error(f"Failed to update profile image in DB: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update profile image")
    finally:
        if cursor: await cursor.close()
        if conn: await conn.close()
    return {"url": f"/uploads/profile_pictures/{file.filename}", "message": "File uploaded successfully"}

# create users
@router.post('/create', dependencies=[Depends(role_required(["superadmin"]))])
async def create_user(
    firstName: str = Form(...),
    middleName: Optional[str] = Form(None),
    lastName: str = Form(...),
    suffix: Optional[str] = Form(None),
    username: str = Form(...), 
    password: str = Form(...), 
    email: str = Form(...), 
    phoneNumber: Optional[str] = Form(None),
    userRole: str = Form(...),
    system: str = Form(...),
    pin: Optional[str] = Form(None),
):
    if userRole not in ['admin', 'manager', 'staff', 'cashier', 'rider', 'super admin', 'user']:
        raise HTTPException(status_code=400, detail="Invalid role")
    if system not in ['IMS', 'POS', 'OOS', 'AUTH']:
        raise HTTPException(status_code=400, detail="Invalid system")
    
    if not password.strip() or len(password.strip()) < 12: 
        raise HTTPException(status_code=400, detail="Password is required and must be at least 12 characters")
    if not username.strip():
        raise HTTPException(status_code=400, detail="Username is required")

    hashed_pin = None
    if userRole == 'manager' and system == 'POS':
        if not pin or not pin.strip() or not pin.isdigit() or len(pin) != 4:
            raise HTTPException(status_code=400, detail="A 4-digit PIN is required for POS Managers.")
        hashed_pin = bcrypt.hashpw(pin.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    conn = None 
    cursor = None
    try:
        conn = await get_db_connection()
        cursor = await conn.cursor()

        await cursor.execute("SELECT 1 FROM Users WHERE Email = ? AND isDisabled = 0", (email,))
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email is already used")

        await cursor.execute("SELECT 1 FROM Users WHERE Username = ? AND isDisabled = 0", (username,))
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail=f"Username '{username}' is already taken.")

        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        await cursor.execute('''
            INSERT INTO Users (UserPassword, Email, UserRole, isDisabled, CreatedAt, System, Username, PhoneNumber, FirstName, MiddleName, LastName, Suffix, Pin)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (hashed_password, email, userRole, 0, datetime.utcnow(), system, username, phoneNumber, firstName, middleName, lastName, suffix, hashed_pin))
        await conn.commit()

    except HTTPException: 
        raise
    except Exception as e:
        logger.error(f"Error in create_user: {e}", exc_info=True) 
        raise HTTPException(status_code=500, detail=f"An internal server error occurred during user creation.")
    finally:
        if cursor: await cursor.close()
        if conn: await conn.close()

    return {'message': f'{userRole.capitalize()} created successfully!'}

# get users
@router.get('/list-users', dependencies=[Depends(role_required(['superadmin']))])
async def list_users():
    conn = None
    cursor = None
    try:
        conn = await get_db_connection()
        cursor = await conn.cursor()
        await cursor.execute(''' 
            SELECT UserID, Email, UserRole, isDisabled, CreatedAt, System, Username, PhoneNumber, FirstName, MiddleName, LastName, Suffix
            FROM Users
        ''')
        users_db = await cursor.fetchall()
    except Exception as e:
        logger.error(f"Error in list_users: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve user list.")
    finally:
        if cursor: await cursor.close()
        if conn: await conn.close()

    users_list = []
    for u in users_db:
        first_name = u[8]
        middle_name = u[9]
        last_name = u[10]
        suffix = u[11]
        name_parts = [first_name, middle_name, last_name, suffix]
        full_name = ' '.join(part for part in name_parts if part)
        
        users_list.append({
            "userID": u[0],
            "fullName": full_name,
            "userRole": u[2],
            "phoneNumber": u[7],
            "id": u[0],
            "role": u[2],
            "phone": u[7],
            "firstName": first_name,
            "middleName": middle_name,
            "lastName": last_name,
            "suffix": suffix,
            "username": u[6],
            "email": u[1],
            "createdAt": u[4].isoformat() if u[4] else None,
            "system": u[5],
            "isDisabled": bool(u[3]),
        })
    return users_list

# get riders
@router.get("/riders")
async def get_riders():
    conn = await get_db_connection()  
    cursor = await conn.cursor()
    await cursor.execute("""
        SELECT UserID, FirstName, LastName, Username, PhoneNumber
        FROM Users
        WHERE UserRole = 'rider' AND isDisabled = 0
    """)
    rows = await cursor.fetchall()
    await cursor.close()
    await conn.close()
    return [
        {
            "UserID": r.UserID,
            "FullName": f"{r.FirstName} {r.LastName}",
            "Username": r.Username,
            "Phone": r.PhoneNumber
        }
        for r in rows
    ]

# get rider by id
@router.get("/riders/{rider_id}")
async def get_rider_by_id(rider_id: int):
    conn = await get_db_connection()  
    cursor = await conn.cursor()
    try:
        await cursor.execute("""
            SELECT UserID, FirstName, LastName, Username, PhoneNumber
            FROM Users
            WHERE UserRole = 'rider' AND isDisabled = 0 AND UserID = ?
        """, (rider_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Rider not found")

        return {
            "UserID": row.UserID,
            "FullName": f"{row.FirstName} {row.LastName}",
            "Username": row.Username,
            "Phone": row.PhoneNumber
        }
    finally:
        await cursor.close()
        await conn.close()

# update users
@router.put("/update/{user_id}", dependencies=[Depends(role_required(['superadmin']))])
async def update_user(
    user_id: int,
    firstName: Optional[str] = Form(None),
    middleName: Optional[str] = Form(None),
    lastName: Optional[str] = Form(None),
    suffix: Optional[str] = Form(None),
    username: Optional[str] = Form(None),
    password: Optional[str] = Form(None), 
    email: Optional[str] = Form(None),
    phoneNumber: Optional[str] = Form(None),
    userRole: Optional[str] = Form(None),
    system: Optional[str] = Form(None),
    pin: Optional[str] = Form(None),
):
    conn = None
    cursor = None
    try:
        conn = await get_db_connection()
        cursor = await conn.cursor()

        await cursor.execute("SELECT UserRole, System FROM Users WHERE UserID = ?", (user_id,))
        user_record = await cursor.fetchone()
        if not user_record:
            raise HTTPException(status_code=404, detail="User not found")
        
        original_role, original_system = user_record
        
        updates = []
        values = []

        if username is not None:
            if not username.strip():
                 raise HTTPException(status_code=400, detail="Username cannot be empty.")
            await cursor.execute("SELECT 1 FROM Users WHERE Username = ? AND UserID != ? AND isDisabled = 0", (username, user_id))
            if await cursor.fetchone():
                raise HTTPException(status_code=400, detail=f"Username '{username}' is already taken.")
            updates.append('Username = ?')
            values.append(username)

        if email is not None:
            if not email.strip():
                 raise HTTPException(status_code=400, detail="Email cannot be empty.")
            await cursor.execute("SELECT 1 FROM Users WHERE Email = ? AND UserID != ? AND isDisabled = 0", (email, user_id))
            if await cursor.fetchone():
                raise HTTPException(status_code=400, detail="Email is already used by another user")
            updates.append('Email = ?')
            values.append(email)
        
        if phoneNumber is not None:
            updates.append('PhoneNumber = ?')
            values.append(phoneNumber if phoneNumber.strip() else None)

        if password is not None and password.strip():
            if len(password.strip()) < 12:
                raise HTTPException(status_code=400, detail="Password must be at least 12 characters.")
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            updates.append('UserPassword = ?')
            values.append(hashed_password)  
        
        if firstName is not None:
            if not firstName.strip():
                raise HTTPException(status_code=400, detail="First name cannot be empty.")
            updates.append('FirstName = ?')
            values.append(firstName)

        if middleName is not None:
            updates.append('MiddleName = ?')
            values.append(middleName if middleName.strip() else None)

        if lastName is not None:
            if not lastName.strip():
                raise HTTPException(status_code=400, detail="Last name cannot be empty.")
            updates.append('LastName = ?')
            values.append(lastName)

        if suffix is not None:
            updates.append('Suffix = ?')
            values.append(suffix if suffix.strip() else None)
        
        if userRole is not None:
            updates.append('UserRole = ?')
            values.append(userRole)

        if system is not None:
            updates.append('System = ?')
            values.append(system)

        final_role = userRole if userRole is not None else original_role
        final_system = system if system is not None else original_system
        
        is_now_pos_manager = (final_role == 'manager' and final_system == 'POS')
        was_originally_pos_manager = (original_role == 'manager' and original_system == 'POS')

        if pin is not None and pin.strip():
            if is_now_pos_manager:
                if not pin.isdigit() or len(pin) != 4:
                    raise HTTPException(status_code=400, detail="A 4-digit PIN is required for POS Managers.")
                hashed_pin = bcrypt.hashpw(pin.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                updates.append('Pin = ?')
                values.append(hashed_pin)
        
        if not is_now_pos_manager and was_originally_pos_manager:
            updates.append('Pin = ?')
            values.append(None)

        if not updates:
            return {'message': 'No fields to update'}

        values.append(user_id)
        
        update_query = f"UPDATE Users SET {', '.join(updates)} WHERE UserID = ?"
        await cursor.execute(update_query, tuple(values))
        await conn.commit()
                
    except HTTPException: 
        raise
    except Exception as e:
        logger.error(f"Error in update_user: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal server error occurred during user update.")
    finally:
        if cursor: await cursor.close()
        if conn: await conn.close()

    return {'message': 'User updated successfully'}

# disable user
@router.put('/disable/{user_id}', dependencies=[Depends(role_required(['superadmin']))])
async def disable_user(user_id: int):
    conn = None
    cursor = None
    try:
        conn = await get_db_connection()
        cursor = await conn.cursor()
        await cursor.execute("SELECT 1 FROM Users WHERE UserID = ? AND isDisabled = 0", (user_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="User not found or already disabled.")
        await cursor.execute("UPDATE Users SET isDisabled = 1 WHERE UserID = ? ", (user_id,))
        await conn.commit()
    except HTTPException: 
        raise
    except Exception as e:
        logger.error(f"Error in disable_user: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal server error occurred during user deletion.")
    finally:
        if cursor: await cursor.close()
        if conn: await conn.close()
    return {'message': 'User disabled successfully'}

# oos signup
@router.post('/signup-oos')
async def signup_oos_user(
    firstName: str = Form(...),
    middleName: Optional[str] = Form(None),
    lastName: str = Form(...),
    suffix: Optional[str] = Form(None),
    username: str = Form(...),
    password: str = Form(...),
    email: str = Form(...),
    phoneNumber: str = Form(...),
):
    userRole = 'user'
    system = 'OOS'
    if not password.strip() or not username.strip():
        raise HTTPException(status_code=400, detail="Username and Password are required")
    conn = None
    cursor = None
    try:
        conn = await get_db_connection()
        cursor = await conn.cursor()
        await cursor.execute("SELECT 1 FROM Users WHERE Username = ? AND System = ? AND isDisabled = 0", (username, system))
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="Username is already taken")
        await cursor.execute("SELECT 1 FROM Users WHERE Email = ? AND System = ? AND isDisabled = 0", (email, system))
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email is already used")
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        await cursor.execute('''
            INSERT INTO Users (UserPassword, Email, UserRole, isDisabled, CreatedAt, System, Username, PhoneNumber, FirstName, MiddleName, LastName, Suffix, Pin)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
        ''', (hashed_password, email, userRole, 0, datetime.utcnow(), system, username, phoneNumber, firstName, middleName, lastName, suffix))
        await conn.commit()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in signup_oos_user: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal server error occurred during signup.")
    finally:
        if cursor: await cursor.close()
        if conn: await conn.close()
    return {'message': 'OOS user account created successfully!'}

# verify manager pin pos
@router.post(
    '/verify-pin',
    response_model=ManagerPinVerifyResponse,
    summary="Verify a Manager's PIN for POS"
)
async def verify_manager_pin(
    request: PinVerificationRequest,

    # ensures only authenticated users can access this endpoint
    current_user: dict = Depends(get_current_active_user)
):
    if not request.pin or not request.pin.isdigit() or len(request.pin) != 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid 4-digit PIN is required."
        )

    conn = None
    try:
        conn = await get_db_connection()
        async with conn.cursor() as cursor:

            # fetch all active POS managers with a PIN
            await cursor.execute("""
                SELECT Username, Pin FROM Users
                WHERE UserRole = 'manager'
                  AND System = 'POS'
                  AND isDisabled = 0
                  AND Pin IS NOT NULL
                  AND Pin != ''
            """)
            
            managers = await cursor.fetchall()

            if not managers:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No active POS managers with a PIN are configured in the system."
                )

            for manager in managers:
                username = manager.Username
                hashed_pin_from_db = manager.Pin
                
                # verify the provided PIN against the stored hash
                try:
                    if bcrypt.checkpw(request.pin.encode('utf-8'), hashed_pin_from_db.encode('utf-8')):
                        logger.info(f"Manager PIN verified successfully for manager: {username}")
                        return ManagerPinVerifyResponse(managerUsername=username)
                except ValueError:
                    logger.warning(f"Skipping PIN check for manager '{username}' due to an invalid hash format in the database.")
                    continue
        
        logger.warning(f"Failed PIN verification attempt by user: {current_user.get('username')}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid PIN."
        )

    except HTTPException:
        raise 
    except Exception as e:
        logger.error(f"Error during PIN verification: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during PIN verification."
        )
    finally:
        if conn:
            await conn.close()

# get own profile oos
@router.get("/profile")
async def get_profile(current_user=Depends(get_current_active_user)):
    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        await cursor.execute("""
            SELECT UserID, Username, FirstName, MiddleName, LastName,
                   Email, PhoneNumber, Block, Street, Subdivision,
                   City, Province, Landmark, Birthday, ProfileImage
            FROM Users
            WHERE Username = ?
        """, (current_user.username,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "userID": row[0],
            "username": row[1],
            "firstName": row[2],
            "middleName": row[3],
            "lastName": row[4],
            "email": row[5],
            "phoneNumber": row[6],
            "block": row[7],
            "street": row[8],
            "subdivision": row[9],
            "city": row[10],
            "province": row[11],
            "landmark": row[12],
            "birthday": row[13],
            "profileImage": f"http://localhost:4000/uploads/profile_pictures/{row[14]}" if row[14] else None

        }
    finally:
        await cursor.close()
        await conn.close()

# update own profile oos
@router.put('/profile/update')
async def update_own_profile(
    username: Optional[str] = Form(None),
    firstName: Optional[str] = Form(None),
    lastName: Optional[str] = Form(None),
    block: Optional[str] = Form(None),
    street: Optional[str] = Form(None),
    subdivision: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    province: Optional[str] = Form(None),
    landmark: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    phoneNumber: Optional[str] = Form(None),
    birthday: Optional[str] = Form(None),   
    current_user=Depends(get_current_active_user)
):
    conn = None
    cursor = None
    try:
        conn = await get_db_connection()
        cursor = await conn.cursor()

        # fetch UserID via username
        await cursor.execute("SELECT UserID FROM Users WHERE Username = ?", (current_user.username,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        user_id = row[0]

        updates = []
        values = []

        if email:
            await cursor.execute("SELECT 1 FROM Users WHERE Email = ? AND UserID != ? AND isDisabled = 0", (email, user_id))
            if await cursor.fetchone():
                raise HTTPException(status_code=400, detail="Email is already used by another user")
            updates.append('Email = ?')
            values.append(email)
        
        if phoneNumber is not None:
            updates.append('PhoneNumber = ?')
            values.append(phoneNumber)

        if city is not None:
            updates.append('City = ?')
            values.append(city)

        if province is not None:
            updates.append('Province = ?')
            values.append(province)

        if landmark is not None:
            updates.append('Landmark = ?')
            values.append(landmark)

        if block is not None:
            updates.append('Block = ?')
            values.append(block)

        if street is not None:
            updates.append('Street = ?')
            values.append(street)

        if subdivision is not None:
            updates.append('Subdivision = ?')
            values.append(subdivision)

        if firstName is not None:
            updates.append('FirstName = ?')
            values.append(firstName)

        if lastName is not None:
            updates.append('LastName = ?')
            values.append(lastName)

        if username is not None:
            updates.append('Username = ?')
            values.append(username)

        if birthday is not None:
            try:
                # ensure proper format YYYY-MM-DD
                datetime.strptime(birthday, "%Y-%m-%d")
                updates.append('Birthday = ?')
                values.append(birthday)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid birthday format")

        if not updates:
            return {'message': 'No fields to update'}

        values.append(user_id)
        
        await cursor.execute(f"UPDATE Users SET {', '.join(updates)} WHERE UserID = ?", tuple(values))
        await conn.commit()
                
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in update_own_profile: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred during user update.")
    finally:
        if cursor: 
            await cursor.close()
        if conn: 
            await conn.close()

    return {'message': 'User updated successfully'}

# get cashiers
@router.get("/cashiers")
async def get_cashiers():
    conn = await get_db_connection()
    cursor = await conn.cursor()
    try:
        await cursor.execute("""
            SELECT UserID, FirstName, LastName, Username, PhoneNumber
            FROM Users
            WHERE UserRole = 'cashier' AND System = 'POS' AND isDisabled = 0
            ORDER BY FirstName, LastName
        """)
        rows = await cursor.fetchall()
        
        return [
            {
                "UserID": r.UserID,
                "FullName": f"{r.FirstName} {r.LastName}",
                "Username": r.Username,
                "Phone": r.PhoneNumber
            }
            for r in rows
        ]
    except Exception as e:
        logger.error(f"Error fetching cashiers: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve cashiers.")
    finally:
        await cursor.close()
        await conn.close()