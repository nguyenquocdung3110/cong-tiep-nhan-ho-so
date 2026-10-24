"use client";

import React from "react";
import { Check, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { servicePackages } from "@/lib/mock-data";
import {
  COUNTRIES,
  DEGREE_LEVELS,
  formatVnd,
  isValidEmail,
  isValidPhone,
  type ServicePackage,
} from "@/lib/quote";

const srOnlyStyle: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

export function QuoteForm() {
  const [country, setCountry] = React.useState<string>("");
  const [degreeLevel, setDegreeLevel] = React.useState<string>("dai_hoc");
  const [selectedPackage, setSelectedPackage] = React.useState<ServicePackage>("co_ban");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [emailError, setEmailError] = React.useState("");
  const emailRef = React.useRef<HTMLInputElement>(null);
  const [website, setWebsite] = React.useState(""); // honeypot, hidden from real visitors
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  // The price shown to the customer is the one the server calculated and saved.
  const [result, setResult] = React.useState<{ price: number; packageName: string } | null>(null);

  function emailProblem(value: string): string {
    const v = value.trim();
    if (!v) return "Vui lòng nhập email.";
    if (!isValidEmail(v)) {
      return "Email không đúng định dạng. Vui lòng nhập lại, ví dụ: ban@email.com";
    }
    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    const problem = emailProblem(email);
    setEmailError(problem);
    if (problem) {
      emailRef.current?.focus();
      return; // invalid email: the form is not sent
    }
    if (!name.trim()) {
      setError("Vui lòng nhập họ tên.");
      return;
    }
    if (!isValidPhone(phone.trim())) {
      setError("Số điện thoại không hợp lệ.");
      return;
    }
    if (!country) {
      setError("Vui lòng chọn quốc gia muốn du học.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/quote-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          country,
          degreeLevel,
          servicePackage: selectedPackage,
          website,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.price !== "number") {
        setError(data.error ?? "Chưa gửi được yêu cầu, vui lòng thử lại.");
        return;
      }
      setResult({ price: data.price, packageName: data.packageName });
    } catch {
      setError("Chưa gửi được yêu cầu, vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="bao-gia" className="scroll-mt-24 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div>
          <h2 className="text-balance text-3xl font-medium tracking-tight md:text-4xl">
            Nhận báo giá dịch vụ ngay
          </h2>
          <p className="mt-3 max-w-lg text-muted-foreground">
            Chọn quốc gia, bậc học và gói dịch vụ theo mẫu ở dưới
          </p>
        </div>

        <Card className="mt-10 p-6 md:p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-8">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="country">Quốc gia muốn du học</Label>
                <Select value={country} onValueChange={(value) => setCountry(value ?? "")}>
                  <SelectTrigger id="country" className="w-full">
                    <SelectValue placeholder="Chọn quốc gia" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Bậc học</Label>
                <RadioGroup
                  value={degreeLevel}
                  onValueChange={setDegreeLevel}
                  className="grid grid-cols-3 gap-2 pt-1"
                >
                  {DEGREE_LEVELS.map((level) => (
                    <label
                      key={level.value}
                      className={cn(
                        "flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-2 py-2 text-sm duration-150",
                        degreeLevel === level.value
                          ? "border-primary bg-accent text-accent-foreground"
                          : "border-input text-muted-foreground hover:bg-muted/50",
                      )}
                    >
                      <RadioGroupItem value={level.value} style={srOnlyStyle} />
                      {level.label}
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Gói dịch vụ</Label>
              <div className="grid gap-4 sm:grid-cols-2">
                {servicePackages.map((pkg) => {
                  const active = selectedPackage === pkg.id;
                  return (
                    <button
                      type="button"
                      key={pkg.id}
                      onClick={() => setSelectedPackage(pkg.id)}
                      className={cn(
                        "rounded-xl border p-5 text-left duration-150",
                        active ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{pkg.name}</span>
                        {active && (
                          <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="size-3.5" />
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-2xl font-semibold tracking-tight">
                        {formatVnd(pkg.price)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{pkg.description}</p>
                      <ul className="mt-4 space-y-2">
                        {pkg.benefits.map((benefit) => (
                          <li key={benefit} className="flex items-start gap-2 text-sm">
                            <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                            <span className="text-muted-foreground">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Họ và tên</Label>
              <Input
                id="name"
                required
                maxLength={200}
                autoComplete="name"
                placeholder="Nguyễn Văn A"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email liên hệ</Label>
                <Input
                  id="email"
                  ref={emailRef}
                  type="email"
                  autoComplete="email"
                  placeholder="ban@email.com"
                  value={email}
                  aria-invalid={emailError ? true : undefined}
                  aria-describedby={emailError ? "email-error" : undefined}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    // once an error is showing, re-check while typing so it clears as soon as it is fixed
                    if (emailError) setEmailError(emailProblem(e.target.value));
                  }}
                  onBlur={() => email && setEmailError(emailProblem(email))}
                />
                {emailError && (
                  <p id="email-error" role="alert" className="text-sm text-red-600">
                    {emailError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  placeholder="09xx xxx xxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Honeypot: off-screen and skipped by keyboard/screen readers; only bots fill it. */}
            <div aria-hidden="true" style={{ position: "absolute", left: -9999 }}>
              <label htmlFor="website">Website</label>
              <input
                id="website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {submitting ? "Đang gửi..." : "Nhận báo giá"}
            </Button>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {result && (
              <div className="space-y-3 rounded-xl border border-primary/20 bg-accent p-5">
                <p className="text-sm text-muted-foreground">
                  Mức giá dự kiến cho gói {result.packageName}
                </p>
                <p className="text-3xl font-semibold tracking-tight text-accent-foreground">
                  {formatVnd(result.price)}
                </p>
                <div className="flex items-start gap-2 text-sm text-accent-foreground">
                  <Mail className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Yêu cầu của bạn đã được ghi nhận. Đội ngũ tư vấn sẽ xem xét và liên hệ với bạn qua email.
                  </span>
                </div>
              </div>
            )}
          </form>
        </Card>
      </div>
    </section>
  );
}
