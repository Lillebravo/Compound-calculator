document.addEventListener("DOMContentLoaded", function () {

  const currencySelector = document.getElementById("currencySelector");
  const pInput = document.getElementById("ogAmount");
  const mInput = document.getElementById("mCont");
  const tInput = document.getElementById("tSaving");
  const tValueSpan = document.getElementById("tSavingValue");
  const numAccountsInput = document.getElementById("numAccounts");
  const accountsSetupDiv = document.getElementById("accountsSetup");
  const finalAmountDiv = document.getElementById("finalAmount");
  const totalContributionsDiv = document.getElementById("totalContributions");
  const totalInterestDiv = document.getElementById("totalInterest");
  const weightedAverageInterestDiv = document.getElementById(
    "weightedAverageInterest"
  );
  const totalInterestPercentageDiv = document.getElementById(
    "totalInterestPercentage"
  );
  const inflationCheckbox = document.getElementById("inflationCheckbox");
  const moneyLostToInflationDiv = document.getElementById(
    "moneyLostToInflation"
  );
  const finalAmountAfterInflationDiv = document.getElementById(
    "finalAmountAfterInflation"
  );
  const calculatorMode = document.getElementById("calculatorMode");
  const monthlyLabel = document.getElementById("monthlyLabel");

  




  let lastKnownFinalAmount = 0;
  let firstYearInterest = 0;
  let contributionModeValues = { p: 100000, m: 1000 };
  let accountSettings = [{ percentage: 100, rate: 10 }];
  let lastCalculatedWithdrawal = 0;





  const exchangeRates = {
    SEK: 1,
    USD: 0.096,
    EUR: 0.087,
    JPY: 14.31,
    GBP: 0.076,
    CNY: 0.69,
    THB: 3.36,
  };

  const currencySymbols = {
    SEK: "kr",
    USD: "$",
    EUR: "€",
    JPY: "¥",
    GBP: "£",
    CNY: "¥",
    THB: "฿",
  };




  function calculateCompoundInterest(accounts, p, m, t, n, isWithdrawal) {
    let totalAmount = p;
    let totalContributions = p;

    // Calculate first year interest
    let firstYearTotal = totalAmount;
    for (let month = 1; month <= 12; month++) {
      accounts.forEach((account) => {
        const contributionAmount = isWithdrawal
          ? 0
          : m * (account.percentage / 100);
        account.balance =
          account.balance * (1 + account.rate / 12 / 100) + contributionAmount;
      });
      firstYearTotal = accounts.reduce(
        (sum, account) => sum + account.balance,
        0
      );
    }
    firstYearInterest =
      firstYearTotal - totalAmount - (isWithdrawal ? 0 : m * 12);

    // Reset account balances for full calculation
    accounts.forEach((account) => {
      account.balance = totalAmount * (account.percentage / 100);
    });

    for (let month = 1; month <= t * n; month++) {
      if (isWithdrawal) {
        accounts.forEach((account) => {
          const withdrawalAmount = m * (account.balance / totalAmount);
          account.balance =
            account.balance * (1 + account.rate / 12 / 100) - withdrawalAmount;
        });
        totalAmount = accounts.reduce(
          (sum, account) => sum + account.balance,
          0
        );
        totalContributions -= m;
      } else {
        accounts.forEach((account) => {
          const contributionAmount = m * (account.percentage / 100);
          account.balance =
            account.balance * (1 + account.rate / 12 / 100) +
            contributionAmount;
        });
        totalAmount = accounts.reduce(
          (sum, account) => sum + account.balance,
          0
        );
        totalContributions += m;
      }
    }

    return {
      finalAmount: totalAmount,
      totalContributions: totalContributions,
      finalAccounts: accounts,
    };
  }


  function updateAccountsSetup() {
    let numAccounts = parseInt(numAccountsInput.value) || 1;
    accountsSetupDiv.innerHTML = "";
    const maxNumAcc = 5;
    const isWithdrawal = calculatorMode.value === "withdrawals";

    if (numAccounts > maxNumAcc) {
      numAccounts = maxNumAcc;
      numAccountsInput.value = maxNumAcc;
    }

    // Adjust accountSettings if the number of accounts has changed
    while (accountSettings.length < numAccounts) {
      accountSettings.push({ percentage: 0, rate: 10 });
    }
    if (accountSettings.length > numAccounts) {
      accountSettings = accountSettings.slice(0, numAccounts);
    }

    // Ensure percentages sum to 100
    const totalPercentage = accountSettings.reduce(
      (sum, account) => sum + account.percentage,
      0
    );
    if (totalPercentage !== 100) {
      const adjustment = (100 - totalPercentage) / accountSettings.length;
      accountSettings.forEach((account) => (account.percentage += adjustment));
    }

    for (let i = 0; i < numAccounts; i++) {
      const accountDiv = document.createElement("div");
      accountDiv.className = "account-setup";

      const percentageInput = document.createElement("input");
      percentageInput.type = "number";
      percentageInput.id = `account${i + 1}Percentage`;
      percentageInput.min = 0;
      percentageInput.max = 100;
      percentageInput.value = accountSettings[i].percentage.toFixed(2);

      percentageInput.addEventListener("input", validateTotalPercentage);

      const percentageLabel = document.createElement("label");
      percentageLabel.htmlFor = `account${i + 1}Percentage`;
      percentageLabel.textContent = isWithdrawal
        ? `Account ${i + 1} (% of current savings):`
        : `Account ${i + 1} contribution (%) of monthly ${
            calculatorMode.value
          }:`;

      accountDiv.appendChild(percentageLabel);
      accountDiv.appendChild(percentageInput);

      const interestInput = document.createElement("input");
      interestInput.type = "number";
      interestInput.id = `account${i + 1}Interest`;
      interestInput.min = 0;
      interestInput.max = 100;
      interestInput.value = accountSettings[i].rate.toFixed(1);
      interestInput.step = 0.1;

      interestInput.addEventListener("input", function() {
        accountSettings[i].rate = parseFloat(this.value) || 0;
        updateResult();
      });

      const interestLabel = document.createElement("label");
      interestLabel.htmlFor = `account${i + 1}Interest`;
      interestLabel.textContent = `Account ${i + 1} interest rate (%):`;

      accountDiv.appendChild(interestLabel);
      accountDiv.appendChild(interestInput);

      accountsSetupDiv.appendChild(accountDiv);
    }

    validateTotalPercentage();
  }


  function updateResult() {
    const p = parseFloat(pInput.value) || 0;
    const m = parseFloat(mInput.value) || 0;
    const t = parseInt(tInput.value) || 0;
    const n = 12; // Compound monthly
    const selectedCurrency = currencySelector.value;
    const accountForInflation = inflationCheckbox.checked;
    const isWithdrawal = calculatorMode.value === "withdrawals";

    tValueSpan.textContent = t + " years";

    const accounts = accountSettings.map((account) => ({
      balance: isWithdrawal ? p * (account.percentage / 100) : 0,
      percentage: account.percentage,
      rate: account.rate,
    }));

    // Calculate first year interest
    const firstYearResult = calculateCompoundInterest(
      JSON.parse(JSON.stringify(accounts)),
      p,
      isWithdrawal ? 0 : m,
      1,
      n,
      false
    );
    firstYearInterest = firstYearResult.finalAmount - p - (isWithdrawal ? 0 : m * 12);

    let adjustedM = m;
    let alertShown = false;
    // Calculate sustainable withdrawal
    if (isWithdrawal) {
      const sustainableMonthlyWithdrawal = calculateSustainableWithdrawal(p, t, n, accounts);
      const maxMonthlyWithdrawal = Math.min(sustainableMonthlyWithdrawal, firstYearInterest / 12);

      if (m > maxMonthlyWithdrawal && !alertShown) {
        adjustedM = maxMonthlyWithdrawal;
        mInput.value = adjustedM.toFixed(2);
        alert(
          `The withdrawal amount has been adjusted to ${formatCurrency(
            adjustedM,
            selectedCurrency
          )} per month to ensure sustainable withdrawals over ${t} years.`
        );
        alertShown = true;
      } else if (m <= lastCalculatedWithdrawal) {
        adjustedM = m; // Keep the current withdrawal if it's less than or equal to the last calculated withdrawal
      }

      lastCalculatedWithdrawal = maxMonthlyWithdrawal;
      monthlyLabel.textContent = `Monthly withdrawals: 0 - ${formatCurrency(maxMonthlyWithdrawal, selectedCurrency)}`;
    }

    const result = calculateCompoundInterest(accounts, p, adjustedM, t, n, isWithdrawal);
    let totalFinalAmount = result.finalAmount;
    const totalContributions = result.totalContributions;
    const totalInterest = totalFinalAmount - totalContributions;

    // Check if withdrawal is too high
    if (isWithdrawal && m * 12 > firstYearInterest) {
      const maxMonthlyWithdrawal = firstYearInterest / 12; 
      alert(
        `You don't have enough interest or savings to make such high withdrawals. The maximum monthly withdrawal has been set to ${formatCurrency(
          maxMonthlyWithdrawal,
          selectedCurrency
        )}.`
      );
      mInput.value = maxMonthlyWithdrawal.toFixed(1);
      m = maxMonthlyWithdrawal;
      // Recalculate with new withdrawal amount
      const newResult = calculateCompoundInterest(
        accounts,
        p,
        m,
        t,
        n,
        isWithdrawal
      );
      totalFinalAmount = newResult.finalAmount;
      updateResult();
    }

    const weightedAverageInterest =
      accounts.reduce(
        (sum, account) => sum + account.rate * account.percentage,
        0
      ) / 100;
    const effectiveAnnualRate =
      (Math.pow(1 + weightedAverageInterest / 100 / n, n) - 1) * 100;

    const totalInterestPercentage = effectiveAnnualRate * t;

    const convertedFinalAmount =
      totalFinalAmount * exchangeRates[selectedCurrency];
    const convertedTotalContributions =
      Math.abs(totalContributions - p) * exchangeRates[selectedCurrency];
    const convertedTotalInterest =
      totalInterest * exchangeRates[selectedCurrency];

    finalAmountDiv.textContent = `Final amount: ${formatCurrency(
      convertedFinalAmount,
      selectedCurrency
    )}`;
    totalContributionsDiv.textContent = `Total ${
      isWithdrawal ? "withdrawals" : "contributions"
    }: ${formatCurrency(convertedTotalContributions, selectedCurrency)}`;
    totalInterestDiv.textContent = `Total interest: ${formatCurrency(
      convertedTotalInterest,
      selectedCurrency
    )}`;
    weightedAverageInterestDiv.textContent = `Average yearly interest rate: ${effectiveAnnualRate.toFixed(
      2
    )}% (${weightedAverageInterest.toFixed(2)}% nominal)`;
    totalInterestPercentageDiv.textContent = `Total interest as percentage: ${totalInterestPercentage.toFixed(
      2
    )}%`;

    if (accountForInflation) {
      const finalAmountAfterInflation = applyInflation(totalFinalAmount, t);
      const moneyLostToInflation = totalFinalAmount - finalAmountAfterInflation;

      const convertedFinalAmountAfterInflation =
        finalAmountAfterInflation * exchangeRates[selectedCurrency];
      const convertedMoneyLostToInflation =
        moneyLostToInflation * exchangeRates[selectedCurrency];

      finalAmountAfterInflationDiv.textContent = `Final amount reduced by inflation: ${formatCurrency(
        convertedFinalAmountAfterInflation,
        selectedCurrency
      )}`;
      moneyLostToInflationDiv.textContent = `Money lost to inflation: -${formatCurrency(
        convertedMoneyLostToInflation,
        selectedCurrency
      )}`;

      finalAmountAfterInflationDiv.style.display = "block";
      moneyLostToInflationDiv.style.display = "block";
    } else {
      finalAmountAfterInflationDiv.style.display = "none";
      moneyLostToInflationDiv.style.display = "none";
    }

    lastKnownFinalAmount = totalFinalAmount;
  }


  function updateWithdrawalAmount() {
    const selectedCurrency = currencySelector.value;
    const defaultWithdrawalSEK = 1000;
    const convertedWithdrawal =
      defaultWithdrawalSEK * exchangeRates[selectedCurrency];
    mInput.value = convertedWithdrawal.toFixed(2);
  }


  function calculateSustainableWithdrawal(p, t, n, accounts) {
    const weightedAverageInterest = accounts.reduce(
      (sum, account) => sum + account.rate * account.percentage,
      0
    ) / 100;
    
    // Use the weighted average interest rate instead of a fixed percentage
    let low = 0;
    let high = p * (weightedAverageInterest / 12); // Initial guess based on yearly interest
    const tolerance = 0.01; // Tolerance for binary search

    while (high - low > tolerance) {
      const mid = (low + high) / 2;
      const result = calculateCompoundInterest(
        JSON.parse(JSON.stringify(accounts)),
        p,
        mid,
        t,
        n,
        true
      );

      if (result.finalAmount >= p) {
        low = mid;
      } else {
        high = mid;
      }
    }

    return low; // Return the highest sustainable monthly withdrawal
  }


  function handleModeChange() {
    const isWithdrawal = calculatorMode.value === "withdrawals";
    monthlyLabel.textContent = isWithdrawal
      ? "Monthly withdrawals:"
      : "Monthly contributions:";

    if (isWithdrawal) {
      contributionModeValues = {
        p: parseFloat(pInput.value),
        m: parseFloat(mInput.value),
      };
      pInput.value = lastKnownFinalAmount.toFixed(2);
      updateResult(); // Calculate firstYearInterest and sustainable withdrawal
      const p = parseFloat(pInput.value) || 0;
      const t = parseInt(tInput.value) || 0;
      const n = 12;
      const accounts = accountSettings.map((account) => ({
        balance: p * (account.percentage / 100),
        percentage: account.percentage,
        rate: account.rate,
      }));
      const sustainableMonthlyWithdrawal = calculateSustainableWithdrawal(p, t, n, accounts);
      const defaultWithdrawal = Math.min(sustainableMonthlyWithdrawal, firstYearInterest / 24);
      mInput.value = defaultWithdrawal.toFixed(2);
      lastCalculatedWithdrawal = sustainableMonthlyWithdrawal;
    } else {
      pInput.value = contributionModeValues.p.toFixed(2);
      mInput.value = contributionModeValues.m.toFixed(2);
    }

    updateAccountsSetup();
    updateResult();
  }


  function applyInflation(amount, years) {
    const inflationRate = 0.02; // 2% annual inflation
    return amount / Math.pow(1 + inflationRate, years);
  }


  function formatCurrency(amount, currency) {
    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${formattedAmount} ${currencySymbols[currency]}`;
  }


  function validateInputs() {
    const p = pInput.value === "" ? 0 : parseFloat(pInput.value);
    const m = mInput.value === "" ? 0 : parseFloat(mInput.value);
    const t = tInput.value === "" ? 0 : parseInt(tInput.value);

    if (pInput.value !== "" && (isNaN(p) || p < 0)) {
      alert("Please enter a valid non-negative number for current savings.");
      pInput.value = "0";
      return false;
    }
    if (mInput.value !== "" && (isNaN(m) || m < 0)) {
      alert(
        "Please enter a valid non-negative number for monthly contributions/withdrawals."
      );
      mInput.value = "0";
      return false;
    }
    if (tInput.value !== "" && (isNaN(t) || t < 1 || t > 60)) {
      alert("Please enter a valid number of years between 1 and 60.");
      tInput.value = "30";
      return false;
    }

    return true;
  }
  

  function validateTotalPercentage() {
    const inputs = accountsSetupDiv.querySelectorAll('input[id$="Percentage"]');
    let total = 0;
    inputs.forEach((input, index) => {
      const value = parseFloat(input.value) || 0;
      total += value;
      accountSettings[index].percentage = value;
    });

    if (total !== 100) {
      // Adjust the last account's percentage
      const lastInput = inputs[inputs.length - 1];
      const adjustedValue = 100 - (total - parseFloat(lastInput.value));
      lastInput.value = adjustedValue.toFixed(2);
      accountSettings[inputs.length - 1].percentage = adjustedValue;
    }

    // Update interest rates
    accountsSetupDiv
      .querySelectorAll('input[id$="Interest"]')
      .forEach((input, index) => {
        accountSettings[index].rate = parseFloat(input.value) || 0;
      });

    updateResult();
  }

  
  function handleError(error) {
    console.error("An error occurred:", error);
    alert("An error occurred. Please check your inputs and try again.");
  }


  function safeUpdateResult() {
    if (validateInputs()) {
      try {
        updateResult();
      } catch (error) {
        console.error("An error occurred:", error);
      }
    }
  }

  
  function resetCalculator() {
    calculatorMode.value = "contributions";
    currencySelector.value = "SEK";
    pInput.value = "100000";
    mInput.value = "1000";
    tInput.value = "30";
    numAccountsInput.value = "1";
    inflationCheckbox.checked = false;

    handleModeChange();
    updateAccountsSetup();
    updateResult();
  }




  // Add reset button to HTML
  const resetButton = document.createElement("button");
  resetButton.textContent = "Reset Calculator";
  resetButton.id = "resetButton";
  resetButton.addEventListener("click", resetCalculator);
  document
    .getElementById("container")
    .insertBefore(resetButton, document.getElementById("results"));





  // Event Listeners
  currencySelector.addEventListener("change", safeUpdateResult);
  pInput.addEventListener("input", safeUpdateResult);
  mInput.addEventListener("input", safeUpdateResult);
  tInput.addEventListener("input", safeUpdateResult);
  numAccountsInput.addEventListener("input", () => {
    if (parseInt(numAccountsInput.value) > 5) {
      numAccountsInput.value = 5;
    } else if (parseInt(numAccountsInput.value) < 1) {
      numAccountsInput.value = 1;
    }
    updateAccountsSetup();
    safeUpdateResult();
  });
  inflationCheckbox.addEventListener("change", safeUpdateResult);
  calculatorMode.addEventListener("change", handleModeChange);
  accountsSetupDiv.addEventListener("input", function (event) {
    if (
      event.target.matches('input[id$="Percentage"], input[id$="Interest"]')
    ) {
      safeUpdateResult();
    }
  });





  // Initial setup
  tValueSpan.textContent = tInput.value + " years";
  updateAccountsSetup();
  safeUpdateResult();
  
});
