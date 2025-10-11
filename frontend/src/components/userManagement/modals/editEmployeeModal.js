import React, { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import "./editEmployeeModal.css";

function EditEmployeeModal({ showModal, onClose, editingEmployee, onSuccess }) {
  const initialFormData = {
    firstName: "",
    middleName: "",
    suffix: "",
    lastName: "",
    username: "",
    email: "",
    phone: "",
    role: "",
    system: "",
    password: "",
    confirmPassword: "",
    pin: "", // Add pin to state
  };

  const [formData, setFormData] = useState(initialFormData);
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [pinError, setPinError] = useState(""); // Add pin error state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (editingEmployee) {
      // Use the individual fields from the API response
      setFormData({
        firstName: editingEmployee.firstName || "",
        middleName: editingEmployee.middleName || "",
        lastName: editingEmployee.lastName || "",
        suffix: editingEmployee.suffix || "",
        username: editingEmployee.username || "",
        email: editingEmployee.email || "",
        phone: editingEmployee.phone === "N/A" ? "" : editingEmployee.phone || "",
        role: editingEmployee.role || "",
        system: editingEmployee.system || "",
        password: "", // Always clear password on open
        confirmPassword: "",
        pin: "", // Always clear PIN on open
      });
    } else {
      setFormData(initialFormData);
    }
    // Reset all errors when modal opens or employee changes
    setPasswordError("");
    setConfirmPasswordError("");
    setPinError("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [editingEmployee, showModal]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getAuthToken = () => localStorage.getItem("authToken");

  const validateForm = () => {
    let isValid = true;
    setPasswordError("");
    setConfirmPasswordError("");
    setPinError("");

    // Password validation (only if a new password is typed)
    if (formData.password) {
      if (formData.password.length < 12) {
        setPasswordError("New password must be at least 12 characters.");
        isValid = false;
      } else if (formData.password !== formData.confirmPassword) {
        setConfirmPasswordError("Passwords do not match!");
        isValid = false;
      }
    }

    // PIN validation (only if role/system match AND a new PIN is typed)
    if (formData.role === 'manager' && formData.system === 'POS' && formData.pin) {
      if (!/^\d{4}$/.test(formData.pin)) {
        setPinError("New PIN must be 4 digits.");
        isValid = false;
      }
    }
    
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!editingEmployee) {
      alert("No employee selected for editing.");
      return;
    }

    if (!validateForm()) {
      return; // Stop if validation fails
    }

    const token = getAuthToken();
    if (!token) {
      alert("Authentication error.");
      onClose();
      return;
    }

    const formDataPayload = new FormData();
    // Append all editable fields
    formDataPayload.append("firstName", formData.firstName);
    formDataPayload.append("middleName", formData.middleName);
    formDataPayload.append("lastName", formData.lastName);
    formDataPayload.append("suffix", formData.suffix);
    formDataPayload.append("email", formData.email);
    formDataPayload.append("phoneNumber", formData.phone);
    formDataPayload.append("userRole", formData.role);
    formDataPayload.append("system", formData.system);

    // Only append password if a new one was entered
    if (formData.password) {
      formDataPayload.append("password", formData.password);
    }

    // Only append PIN if a new one was entered for a POS Manager
    if (formData.role === 'manager' && formData.system === 'POS' && formData.pin) {
      formDataPayload.append("pin", formData.pin);
    }

    const url = `http://127.0.0.1:4000/users/update/${editingEmployee.id}`;

    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formDataPayload,
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to update employee");
      }
      alert("Employee updated successfully!");
      onClose();
      if (onSuccess) onSuccess();
    } catch (err)      {
      console.error("Update error:", err);
      alert(err.message);
    }
  };

  if (!showModal) return null;

  const showPinField = formData.role === 'manager' && formData.system === 'POS';

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Edit Employee</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="row">
              <div>
                <label>First Name<span className="required">*</span></label>
                <input type="text" name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleFormChange} required />
              </div>
              <div>
                <label>Last Name<span className="required">*</span></label>
                <input type="text" name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleFormChange} required />
              </div>
            </div>
            <div className="row">
              <div>
                <label>Middle Name</label>
                <input type="text" name="middleName" placeholder="Middle Name" value={formData.middleName} onChange={handleFormChange} />
              </div>
              <div>
                <label>Suffix</label>
                <input type="text" name="suffix" placeholder="Suffix" value={formData.suffix} onChange={handleFormChange} />
              </div>
            </div>
            <div className="row">
              <div>
                <label>Username</label>
                <input type="text" name="username" placeholder="Username" value={formData.username} disabled />
              </div>
            </div>
            <div className="row">
              <div>
                <label>Email Address<span className="required">*</span></label>
                <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleFormChange} required />
              </div>
              <div>
                <label>Phone Number</label>
                <input type="tel" name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleFormChange} />
              </div>
            </div>
            <div className="row">
              <div>
                <label>Role<span className="required">*</span></label>
                <select name="role" value={formData.role} onChange={handleFormChange} required>
                  <option value="">Select Role</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                  <option value="rider">Rider</option>
                  <option value="cashier">Cashier</option>
                  <option value="user">User</option>
                  <option value="super admin">Super Admin</option>
                </select>
              </div>
              <div>
                <label>System<span className="required">*</span></label>
                <select name="system" value={formData.system} onChange={handleFormChange} required>
                  <option value="">Select System</option>
                  <option value="IMS">IMS</option>
                  <option value="POS">POS</option>
                  <option value="OOS">OOS</option>
                  <option value="AUTH">AUTH</option>
                </select>
              </div>
            </div>

            {showPinField && (
              <div className="row">
                <div>
                  <label>New Manager PIN (4 Digits)</label>
                  <input type="password" name="pin" placeholder="Leave blank to keep unchanged" value={formData.pin} onChange={handleFormChange} maxLength="4" />
                  {pinError && <div className="error-message">{pinError}</div>}
                </div>
                <div></div>
              </div>
            )}

            <div className="row">
              <div>
                <label>New Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showPassword ? "text" : "password"} name="password" placeholder="Leave blank to keep unchanged" value={formData.password} onChange={handleFormChange} style={{ paddingRight: "40px" }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", color: "#5BA7B4" }}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordError && <div className="error-message">{passwordError}</div>}
              </div>
              <div>
                <label>Confirm New Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" placeholder="Confirm new password" value={formData.confirmPassword} onChange={handleFormChange} style={{ paddingRight: "40px" }}/>
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", color: "#5BA7B4" }}>
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPasswordError && <div className="error-message">{confirmPasswordError}</div>}
              </div>
            </div>

            <button type="submit" className="save-btn">Update Employee</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EditEmployeeModal;