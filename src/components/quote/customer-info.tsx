"use client";

import { User, Mail, Phone, ChevronDown, Search, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface CustomerInfoProps {
  name: string;
  email: string;
  phone: string;
  onChange: (field: "name" | "email" | "phone", value: string) => void;
  onSelectExisting?: (customer: Customer) => void;
}

export default function CustomerInfo({
  name,
  email,
  phone,
  onChange,
  onSelectExisting,
}: CustomerInfoProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showPicker && !loaded) {
      const supabase = createClient();
      supabase
        .from("customers")
        .select("id, name, email, phone")
        .order("name")
        .then(({ data }) => {
          if (data) setCustomers(data);
          setLoaded(true);
        });
    }
  }, [showPicker, loaded]);

  // Close picker on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    if (showPicker) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showPicker]);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  );

  const handleSelect = (c: Customer) => {
    onChange("name", c.name);
    onChange("email", c.email || "");
    onChange("phone", c.phone || "");
    onSelectExisting?.(c);
    setShowPicker(false);
    setSearch("");
  };

  const handleDeleteCustomer = async (e: React.MouseEvent, customerId: string) => {
    e.stopPropagation();
    const supabase = createClient();

    // Check if customer has any quotes
    const { count } = await supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId);

    if (count && count > 0) {
      alert("This customer has existing quotes and cannot be deleted.");
      return;
    }

    if (!confirm("Delete this customer? This cannot be undone.")) return;

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", customerId);
    if (!error) {
      setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-semibold text-gray-900">
          Customer Info
        </label>
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          Past Customer
        </button>
      </div>

      {/* Customer Picker Dropdown */}
      {showPicker && (
        <div
          ref={pickerRef}
          className="mb-3 border border-gray-200 rounded-xl bg-white shadow-lg overflow-hidden"
        >
          <div className="relative p-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers..."
              autoFocus
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <p className="p-3 text-sm text-gray-400 text-center">
                {loaded ? "No customers found" : "Loading..."}
              </p>
            ) : (
              filteredCustomers.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-1 pr-2"
                >
                  <button
                    type="button"
                    onClick={() => handleSelect(c)}
                    className="flex-1 flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 active:bg-blue-100 transition-colors text-left min-w-0"
                  >
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {c.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {c.email}
                        {c.phone ? ` • ${c.phone}` : ""}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteCustomer(e, c.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                    title="Delete customer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {/* Name */}
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="Customer name *"
            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"
          />
        </div>

        {/* Email */}
        <div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => onChange("email", e.target.value)}
              placeholder="Email address *"
              className={`w-full pl-11 pr-4 py-3.5 bg-gray-50 border rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white ${
                email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                  ? "border-red-300 bg-red-50"
                  : "border-gray-200"
              }`}
            />
          </div>
          {email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
            <p className="text-xs text-red-500 mt-1 ml-1">Please enter a valid email address</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                // Only allow digits, spaces, dashes, parens, plus
                const cleaned = e.target.value.replace(/[^\d\s\-()+ ]/g, "");
                onChange("phone", cleaned);
              }}
              placeholder="Phone number *"
              className={`w-full pl-11 pr-4 py-3.5 bg-gray-50 border rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white ${
                phone && !/^[+]?[\d\s\-()]{7,}$/.test(phone)
                  ? "border-red-300 bg-red-50"
                  : "border-gray-200"
              }`}
            />
          </div>
          {phone && !/^[+]?[\d\s\-()]{7,}$/.test(phone) && (
            <p className="text-xs text-red-500 mt-1 ml-1">Please enter a valid phone number (at least 7 digits)</p>
          )}
        </div>
      </div>
    </div>
  );
}
