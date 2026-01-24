"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { UserPlus, Shield, Loader2, Mail, Phone, Calendar } from "lucide-react";

interface Admin {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 폼 상태
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function fetchAdmins() {
    try {
      const response = await fetch("/api/admins");
      if (response.ok) {
        const data = await response.json();
        setAdmins(data);
      }
    } catch (error) {
      console.error("Error fetching admins:", error);
      toast.error("관리자 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("관리자가 추가되었습니다.");
        setAdmins((prev) => [data, ...prev]);
        setIsDialogOpen(false);
        setFormData({ name: "", email: "", password: "", phone: "" });
      } else {
        toast.error(data.error || "관리자 추가에 실패했습니다.");
      }
    } catch (error) {
      console.error("Error creating admin:", error);
      toast.error("관리자 추가 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="관리자 관리"
        description="시스템 관리자를 관리합니다."
        customAction={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                관리자 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>새 관리자 추가</DialogTitle>
                  <DialogDescription>
                    새로운 관리자 계정을 생성합니다.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">이름 *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="홍길동"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">이메일 *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="admin@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">비밀번호 *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="최소 8자 이상"
                      required
                      minLength={8}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">연락처</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="010-1234-5678"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    취소
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        추가 중...
                      </>
                    ) : (
                      "추가"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            관리자 목록
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : admins.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead className="hidden sm:table-cell">연락처</TableHead>
                    <TableHead className="hidden sm:table-cell">등록일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">{admin.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground hidden sm:inline" />
                          <span className="text-sm">{admin.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {admin.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{admin.phone}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(admin.createdAt), "yyyy.MM.dd", {
                            locale: ko,
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              등록된 관리자가 없습니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
