"use client";

import React from "react";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAccountAction,
  type AccountActionResult,
} from "@/app/admin/(dashboard)/accounts/actions";

export function AddAccountForm() {
  const [state, action, pending] = React.useActionState<AccountActionResult | null, FormData>(
    createAccountAction,
    null,
  );

  return (
    <Card className="max-w-3xl p-5">
      <h2 className="text-base font-medium">Thêm tài khoản</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tài khoản mới đăng nhập được ngay tại trang đăng nhập quản trị bằng email và mật khẩu này.
        Hãy gửi mật khẩu cho người dùng qua kênh an toàn.
      </p>

      {/* noValidate: the server checks everything and answers in Vietnamese (browser messages are English) */}
      <form action={action} noValidate className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-email">Email</Label>
            <Input
              id="new-email"
              name="email"
              type="email"
              autoComplete="off"
              required
              defaultValue={state?.email ?? ""}
              placeholder="ten@congty.vn"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">Mật khẩu</Label>
            <Input
              id="new-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="new-role">Vai trò</Label>
          <select
            id="new-role"
            name="role"
            defaultValue="nhan_vien"
            className="h-9 w-full rounded-full border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-72"
          >
            <option value="nhan_vien">Nhân viên (chỉ xem)</option>
            <option value="admin">Quản trị viên (xem, sửa, xóa, quản lý tài khoản)</option>
          </select>
        </div>

        {state && (
          <p
            role="alert"
            className={
              "rounded-lg px-3 py-2 text-sm " +
              (state.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")
            }
          >
            {state.message}
          </p>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <UserPlus />}
          {pending ? "Đang tạo..." : "Thêm tài khoản"}
        </Button>
      </form>
    </Card>
  );
}
